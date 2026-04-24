import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BetForm from './BetForm';
import { ethers } from 'ethers';

// Mock constants
jest.mock('../contracts/constants', () => ({
  ADDRESSES: { PREDICTION_MARKET: '0x123' }
}));

const mockMarket = {
  options: ['Yes', 'No'],
};

const mockContracts = {
  token: {
    approve: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
  },
  market: {
    placeBet: jest.fn().mockResolvedValue({ wait: jest.fn().mockResolvedValue({}) }),
  },
};

describe('BetForm Component', () => {
  test('renders options and input', () => {
    render(<BetForm market={mockMarket} marketId={0} contracts={mockContracts} onBetPlaced={() => {}} />);
    
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.0')).toBeInTheDocument();
  });

  test('validates input amount', async () => {
    render(<BetForm market={mockMarket} marketId={0} contracts={mockContracts} onBetPlaced={() => {}} />);
    
    const input = screen.getByPlaceholderText('0.0');
    fireEvent.change(input, { target: { value: '-1' } });
    
    const submitBtn = screen.getByText('Confirm Bet');
    fireEvent.click(submitBtn);

    // Should not call contracts if amount is invalid
    expect(mockContracts.token.approve).not.toHaveBeenCalled();
  });

  test('handles successful bet placement', async () => {
    render(<BetForm market={mockMarket} marketId={0} contracts={mockContracts} onBetPlaced={() => {}} />);
    
    // Select option
    fireEvent.click(screen.getByText('Yes'));
    
    // Enter amount
    fireEvent.change(screen.getByPlaceholderText('0.0'), { target: { value: '10' } });
    
    // Submit
    fireEvent.click(screen.getByText('Confirm Bet'));
    
    await waitFor(() => {
      expect(mockContracts.token.approve).toHaveBeenCalled();
      expect(mockContracts.market.placeBet).toHaveBeenCalled();
    });
  });
});
