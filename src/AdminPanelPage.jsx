import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'admin_users';

const AdminPanelPage = () => {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');

  useEffect(() => {
    const savedUsers = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const defaultUsers = [
        { id: 1, email: 'admin@example.com', role: 'admin' },
        { id: 2, email: 'user@example.com', role: 'user' },
      ];
      setUsers(defaultUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultUsers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const deleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const changeRole = (id, newRole) => {
    setUsers(users.map(user =>
      user.id === id ? { ...user, role: newRole } : user
    ));
  };

  const addUser = () => {
    if (!newEmail.trim()) return;

    const alreadyExists = users.some(user => user.email === newEmail.trim());
    if (alreadyExists) {
      alert("Użytkownik o tym adresie email już istnieje.");
      return;
    }

    const newUser = {
      id: Date.now(),
      email: newEmail.trim(),
      role: newRole,
    };

    setUsers([...users, newUser]);
    setNewEmail('');
    setNewRole('user');
  };

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-screen-xl 2xl:max-w-screen-2xl">
      <div className="mx-auto w-full md:w-5/6 lg:w-3/5 xl:w-3/5 2xl:w-3/5">
        <h1 className="text-2xl sm:text-3xl font-bold text-center py-4 text-slate-800">Panel administratora</h1>

        {/* Formularz dodawania użytkownika */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Wpisz email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rola</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              >
                <option value="user">Użytkownik</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            <button
              onClick={addUser}
              className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              Dodaj użytkownika
            </button>
          </div>
        </div>

        {/* Tabela użytkowników */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rola
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm rounded-md"
                    >
                      <option value="admin">Administrator</option>
                      <option value="user">Użytkownik</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelPage;