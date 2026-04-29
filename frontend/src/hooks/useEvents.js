import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import * as StellarSdk from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';

export const useEvents = (account, refreshBalance) => {
  const server = new StellarSdk.rpc.Server(RPC_URL);
  const lastLedgerRef = useRef(0);

  useEffect(() => {
    if (!account) return;

    const pollEvents = async () => {
      try {
        // Get current ledger
        const latestLedgerResponse = await server.getLatestLedger();
        const latestLedger = latestLedgerResponse.sequence;
        
        if (lastLedgerRef.current === 0) {
          lastLedgerRef.current = latestLedger - 10; // Start from a few ledgers back
        }

        if (latestLedger <= lastLedgerRef.current) return;

        const events = await server.getEvents({
          startLedger: lastLedgerRef.current + 1,
          filters: [
            {
              type: 'contract',
              // Add filters if needed, or just poll all and filter manually
            },
          ],
        });

        for (const event of events.events) {
          // Parse events here based on contract topics
          // Example: topic[0] == symbol_short!("bet")
          const topics = event.topic;
          if (topics && topics.length > 0) {
            const topicName = StellarSdk.scValToNative(topics[0]);
            
            if (topicName === 'bet') {
              const marketId = StellarSdk.scValToNative(topics[1]);
              const data = StellarSdk.scValToNative(event.value);
              // data = [user, option, amount]
              if (account && data[0].toString() === account) {
                toast.success(`Bet placed on Market #${marketId}!`, {
                  description: `${Number(data[2]) / 1e7} MTK`,
                });
                if (refreshBalance) refreshBalance();
              }
            } else if (topicName === 'resolve') {
              const marketId = StellarSdk.scValToNative(topics[1]);
              toast.info(`Market #${marketId} has been resolved!`);
            }
          }
        }

        lastLedgerRef.current = latestLedger;
      } catch (e) {
        console.error("Event polling failed", e);
      }
    };

    const interval = setInterval(pollEvents, 5000);
    return () => clearInterval(interval);
  }, [account, refreshBalance]);
};
