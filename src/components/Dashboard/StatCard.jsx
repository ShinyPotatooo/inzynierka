const StatCard = ({
	label,
	value,
	className = '',
	textColor = 'text-slate-700',
}) => (
	<div className={`p-6 rounded-lg shadow-sm bg-white ${className}`}>
		<h3 className={`text-sm font-medium ${textColor}`}>{label}</h3>
		<p className='text-3xl font-bold mt-2'>{value}</p>
	</div>
);

export default StatCard;
