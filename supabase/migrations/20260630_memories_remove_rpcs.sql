-- Quitar un recuerdo por su id (desde la página de recuerdos). Borra la fila y
-- desmarca is_memory en las filas del check (y hermanas por fan-out) para que el
-- cron de purga limpie el archivo del storage cuando cierre la ventana.
create or replace function public.remove_memory_by_id(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_check uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select check_id into v_check from memories where id = p_id and user_id = v_uid;
  delete from memories where id = p_id and user_id = v_uid;
  if v_check is not null then
    update daily_checks d set is_memory = false
     from daily_checks s
     where s.id = v_check and d.user_id = v_uid
       and d.check_date = s.check_date and d.kind = s.kind
       and coalesce(d.goal_id::text,'') = coalesce(s.goal_id::text,'');
  end if;
end; $$;

-- Al borrar (soft-delete) una meta, quitar sus recuerdos y desmarcar is_memory
-- en sus checks para que la purga elimine los archivos. Identifica por goal_id
-- vía los checks (las filas de check siguen existiendo en el soft-delete).
create or replace function public.remove_memories_for_goal(p_goal_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  delete from memories m
   where m.user_id = v_uid
     and exists (
       select 1 from daily_checks dc
       where dc.id = m.check_id and dc.goal_id = p_goal_id and dc.user_id = v_uid
     );
  update daily_checks set is_memory = false
   where user_id = v_uid and goal_id = p_goal_id and is_memory = true;
end; $$;

grant execute on function public.remove_memory_by_id(uuid)     to authenticated;
grant execute on function public.remove_memories_for_goal(uuid) to authenticated;
