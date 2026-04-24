import { renderHook, act } from '@testing-library/react';
import { useWeb3 } from './useWeb3';
import { ethers } from 'ethers';

// Mock window.ethereum
const mockRequest = jest.fn();
window.ethereum = {
  request: mockRequest,
  on: jest.fn(),
  removeListener: jest.fn(),
};

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn().mockImplementation(() => ({
      getSigner: jest.fn().mockResolvedValue({
        getAddress: jest.fn().mockResolvedValue('0xAddress'),
      }),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      owner: jest.fn().mockResolvedValue('0xOwner'),
      balanceOf: jest.fn().mockResolvedValue(BigInt(1000000000000000000)), // 1 MTK
    })),
    formatEther: jest.fn().mockReturnValue('1.0'),
    parseEther: jest.fn().mockReturnValue(BigInt(1000000000000000000)),
  },
}));

describe('useWeb3 Hook', () => {
  test('connectWallet updates account state', async () => {
    mockRequest.mockResolvedValue(['0xAddress']);
    
    const { result } = renderHook(() => useWeb3());
    
    await act(async () => {
      await result.current.connectWallet();
    });
    
    expect(result.current.account).toBe('0xAddress');
    expect(result.current.tokenBalance).toBe('1.0');
  });
});
