import React from 'react';
import StatCard from '../components/Dashboard/StatCard';

const DashboardPage = () => {
	const storedItems = JSON.parse(localStorage.getItem('inventory_items')) || [];

	const available = storedItems.filter((i) => i.status === 'dostępny').length;
	const deleted = storedItems.filter((i) => i.status === 'usunięty').length;
	const reserved = storedItems.filter(
		(i) => i.status === 'zarezerwowany'
	).length;

	return (
		<div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-50 min-h-screen'>
			{/* Nagłówek */}
			<div className='mb-10'>
				<h1 className='text-4xl font-extrabold text-slate-900'>Dashboard</h1>
				<div className='mt-3 h-1.5 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full'></div>
			</div>

			{/* Karty statystyk - bardziej wyraziste */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-12'>
				<StatCard
					label='Dostępne towary'
					value={available}
					className='bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-200 shadow-lg'
					textColor='text-green-800'
					valueColor='text-green-600'
					icon='✅'
				/>
				<StatCard
					label='Usunięte towary'
					value={deleted}
					className='bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-200 shadow-lg'
					textColor='text-red-800'
					valueColor='text-red-600'
					icon='❌'
				/>
				<StatCard
					label='Rezerwacje'
					value={reserved}
					className='bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-200 shadow-lg'
					textColor='text-amber-800'
					valueColor='text-amber-600'
					icon='⏳'
				/>
			</div>

			{/* Sekcja powiadomień - bardziej wyrazista */}
			<div className='bg-white rounded-xl shadow-lg p-8 mb-12 border-2 border-slate-100'>
				<h2 className='text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2'>
					Powiadomienia
				</h2>
				<div className='flex items-center justify-center py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg'>
					<p className='text-lg text-slate-600 font-medium'>
						Brak powiadomień.
					</p>
				</div>
			</div>

			{/* Sekcja wykresów - bardziej wyrazista */}
			<div className='bg-white rounded-xl shadow-lg p-8 border-2 border-slate-100'>
				<h2 className='text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2'>
					Wykresy
				</h2>
				<div className='flex items-center justify-center py-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg'>
					<p className='text-lg text-slate-600 font-medium'>Wkrótce...</p>
				</div>
			</div>
		</div>
	);
};

export default DashboardPage;
