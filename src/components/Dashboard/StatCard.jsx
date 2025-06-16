import React from 'react';


const StatCard = ({ label, value, color }) => {
  const cardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    backgroundColor: color || '#f5f5f5',
    flex: 1,
    textAlign: 'center'
  };

  return (
    <div style={cardStyle}>
      <h3>{label}</h3>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );
};

export default StatCard;
