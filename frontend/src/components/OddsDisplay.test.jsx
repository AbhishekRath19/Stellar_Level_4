import React from 'react';
import { render, screen } from '@testing-library/react';
import OddsDisplay from './OddsDisplay';

describe('OddsDisplay Component', () => {
  test('calculates correct percentages for 50/50 split', () => {
    const totalBets = [BigInt(100), BigInt(100)];
    const options = ['Yes', 'No'];
    
    render(<OddsDisplay totalBets={totalBets} options={options} />);
    
    const percentages = screen.getAllByText(/50.00%/);
    expect(percentages).toHaveLength(2);
  });

  test('calculates correct percentages for 75/25 split', () => {
    const totalBets = [BigInt(300), BigInt(100)];
    const options = ['Yes', 'No'];
    
    render(<OddsDisplay totalBets={totalBets} options={options} />);
    
    expect(screen.getByText('75.00%')).toBeInTheDocument();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
  });

  test('handles zero bets gracefully', () => {
    const totalBets = [BigInt(0), BigInt(0)];
    const options = ['Yes', 'No'];
    
    render(<OddsDisplay totalBets={totalBets} options={options} />);
    
    // Should show equal split (50%)
    const percentages = screen.getAllByText(/50.00%/);
    expect(percentages).toHaveLength(2);
  });
});
