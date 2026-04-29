import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BetForm from './BetForm';
import * as StellarSdk from '@stellar/stellar-sdk';

jest.mock('@stellar/stellar-sdk', () => ({
  ...jest.requireActual('@stellar/stellar-sdk'),
  nativeToScVal: jest.fn().mockReturnValue({}),
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockReturnValue({}),
  })),
}));
const mockMarket = {
  options: ['Yes', 'No'],
};

describe('BetForm Component', () => {
  const mockSubmitSorobanTx = jest.fn().mockResolvedValue({ status: 'SUCCESS' });

  test('renders options and input', () => {
    render(<BetForm market={mockMarket} marketId={0} account="GA5W6YONB7DW7I73J5KTS3D6P63J5TS6X7G7G7G7G7G7G7G7G7G7G7G7" submitSorobanTx={mockSubmitSorobanTx} onBetPlaced={() => {}} />);
    
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  test('handles successful bet placement', async () => {
    const onBetPlaced = jest.fn();
    render(<BetForm market={mockMarket} marketId={0} account="GA5W6YONB7DW7I73J5KTS3D6P63J5TS6X7G7G7G7G7G7G7G7G7G7G7G7" submitSorobanTx={mockSubmitSorobanTx} onBetPlaced={onBetPlaced} />);
    
    // Select option
    fireEvent.click(screen.getByText('Yes'));
    
    // Enter amount
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '10' } });
    
    // Submit
    fireEvent.click(screen.getByText('INITIALIZE POSITION'));
    
    await waitFor(() => {
      expect(mockSubmitSorobanTx).toHaveBeenCalledTimes(2); // Approve then Place Bet
      expect(onBetPlaced).toHaveBeenCalled();
    });
  });
});
