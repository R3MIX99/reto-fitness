-- process_seasons recalcula la racha de cada (usuario,grupo) afectado tras
-- auto-aprobar checks. Aplicada vía MCP el 2026-06-30 (upyuvlqjxwgcghtuihec).
create or replace function public.process_seasons()
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  s record; c record;
  v_today date; v_phase_end date; v_all_done boolean;
  v_aff text[] := '{}'; v_item text;
begin
  v_today := (now() at time zone 'America/Mexico_City')::date;

  for s in select * from seasons where status = 'active' loop
    for c in
      select dc.id, dc.user_id, dc.check_date from daily_checks dc
      where dc.group_id = s.group_id and dc.status='pending'
        and dc.check_date between s.start_date and s.end_date
    loop
      v_phase_end := s.start_date + ((floor((c.check_date - s.start_date)::numeric / 7)::int + 1) * 7) - 1;
      if v_today > v_phase_end + s.grace_days then
        update daily_checks set status='approved' where id=c.id;
        perform recalc_day_score(c.user_id, s.group_id, c.check_date);
        v_aff := array_append(v_aff, c.user_id::text||'|'||s.group_id::text);
      end if;
    end loop;
    if v_today > s.end_date then
      update seasons set status='reviewing' where id=s.id;
    end if;
  end loop;

  for s in select * from seasons where status='reviewing' loop
    select not exists (
      select 1 from daily_checks dc
      where dc.group_id=s.group_id and dc.status='pending'
        and dc.check_date between s.start_date and s.end_date
    ) into v_all_done;

    if v_all_done or v_today > s.end_date + s.grace_days then
      for c in
        select dc.id, dc.user_id, dc.check_date from daily_checks dc
        where dc.group_id=s.group_id and dc.status='pending'
          and dc.check_date between s.start_date and s.end_date
      loop
        update daily_checks set status='approved' where id=c.id;
        perform recalc_day_score(c.user_id, s.group_id, c.check_date);
        v_aff := array_append(v_aff, c.user_id::text||'|'||s.group_id::text);
      end loop;

      insert into season_standings (season_id, user_id, rank, total_points)
      select s.id, t.user_id, t.rnk, t.pts from (
        select sm.user_id,
               coalesce(sum(ds.total_points),0) as pts,
               rank() over (order by coalesce(sum(ds.total_points),0) desc) as rnk
        from season_members sm
        left join daily_scores ds on ds.user_id=sm.user_id and ds.group_id=s.group_id
          and ds.score_date between s.start_date and s.end_date
        where sm.season_id=s.id group by sm.user_id
      ) t
      on conflict (season_id, user_id) do update
        set rank=excluded.rank, total_points=excluded.total_points;

      update seasons set status='finished', finished_at=now() where id=s.id;

      insert into notifications (user_id, type, title, body, metadata)
      select sm.user_id, 'season_finished', 'Temporada finalizada',
             'Se cerró la temporada "' || s.name || '". Revisa el podio.',
             jsonb_build_object('url','/grupo','season_id',s.id)
      from season_members sm where sm.season_id=s.id;
    end if;
  end loop;

  for v_item in select distinct a from unnest(v_aff) a loop
    perform compute_user_streak(split_part(v_item,'|',1)::uuid, split_part(v_item,'|',2)::uuid);
  end loop;
end;$function$;
