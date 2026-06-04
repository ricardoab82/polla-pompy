import { requireAdmin } from '@/lib/auth-helpers';
import Avatar from '@/components/ui/Avatar';
import { toggleUserActiveAction, assignCoAdminAction } from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

export default async function AdminUsersPage() {
  const { supabase, profile } = await requireAdmin();

  const isAdmin = profile.role === 'admin';

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at');

  const { data: pickCounts } = await supabase
    .from('picks')
    .select('user_id');

  const pickCountMap = new Map<string, number>();
  pickCounts?.forEach((p) => pickCountMap.set(p.user_id, (pickCountMap.get(p.user_id) ?? 0) + 1));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-4">
        <a href="/admin" className="text-sm text-gray-400 hover:text-gray-600">← Admin</a>
        <h1 className="font-display text-4xl text-[#0a4a2e]">Usuarios</h1>
        <span className="text-sm text-gray-400">({users?.length ?? 0})</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase">
              <th className="py-2 px-2 text-left">Usuario</th>
              <th className="py-2 px-2 text-left hidden md:table-cell">Email</th>
              <th className="py-2 px-2 text-center">Rol</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell">Picks</th>
              <th className="py-2 px-2 text-center">Estado</th>
              {isAdmin && <th className="py-2 px-2 text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className={`border-b border-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <Avatar displayName={u.display_name} avatarUrl={u.avatar_url} size={28} />
                    <span className="font-medium truncate max-w-[120px]">{u.display_name}</span>
                    {u.auth_provider === 'google' && (
                      <span className="text-xs text-blue-400">G</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-500 hidden md:table-cell text-xs">
                  {u.email}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${u.role === 'admin'    ? 'bg-[#f5c842] text-[#0a4a2e]' :
                      u.role === 'co-admin' ? 'bg-purple-100 text-purple-700' :
                                              'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-gray-500 hidden sm:table-cell">
                  {pickCountMap.get(u.id) ?? 0}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className={`text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-red-400'}`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="py-3 px-2 text-center">
                    {u.role !== 'admin' && u.id !== profile.id && (
                      <div className="flex items-center gap-2 justify-center">
                        {/* Toggle active */}
                        <form action={formAction(toggleUserActiveAction)}>
                          <input type="hidden" name="user_id"   value={u.id} />
                          <input type="hidden" name="is_active" value={String(u.is_active)} />
                          <button type="submit" className="text-xs text-gray-400 hover:text-gray-700">
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </form>
                        {/* Toggle co-admin */}
                        <form action={formAction(assignCoAdminAction)}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === 'co-admin' ? 'participant' : 'co-admin'} />
                          <button type="submit" className="text-xs text-purple-500 hover:text-purple-700">
                            {u.role === 'co-admin' ? 'Quitar co-admin' : 'Hacer co-admin'}
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
