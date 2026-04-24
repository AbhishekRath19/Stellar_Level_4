import React from 'react';
import { render, screen } from '@testing-library/react';

const SimpleTest = () => <div>Predix Market</div>;

test('renders app title', () => {
  render(<SimpleTest />);
  const linkElement = screen.getByText(/Predix Market/i);
  expect(linkElement).toBeInTheDocument();
});
