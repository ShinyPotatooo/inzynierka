import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
//import './Navbar.css';

export default function Navbar() {
	const { logout } = useContext(AuthContext);
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	return (
		<nav className='flex pl-4 py-4 gap-4 bg-slate-700 text-white border-b-2 border-slate-900/30'>
			<NavLink className='nav-link hover:text-blue-200' to='/dashboard'>
				Dashboard
			</NavLink>
			<NavLink className='nav-link hover:text-blue-200' to='/inventory'>
				Magazyn
			</NavLink>
			<NavLink className='nav-link hover:text-blue-200' to='/admin'>
				Admin
			</NavLink>
			<button onClick={handleLogout} className='nav-link hover:text-blue-200 ml-auto mr-4'>
				Wyloguj
			</button>
		</nav>
	);
}
