import { useEffect, useState } from 'react';
import { server, TOKEN_CONTRACT_ID, NETWORK_PASSPHRASE } from '../config/stellar';

export const useSorobanEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pollInterval;

    const pollEvents = async () => {
      try {
        // Get latest ledger to determine start point
        const latestLedger = await server.getLatestLedger();
        const currentLedger = latestLedger.sequence;
        
        // Fetch events from last 100 ledgers
        const startLedger = currentLedger - 100;
        
        const response = await server.getEvents({
          startLedger,
          filters: [
            {
              type: "contract",
              contractIds: [TOKEN_CONTRACT_ID]
            }
          ]
        });

        if (response.events && response.events.length > 0) {
          setEvents(prev => {
            // Filter out events we already have in state
            const newEvents = response.events.filter(
              e => !prev.find(p => p.id === e.id)
            );
            // Combine and sort by ledger (descending)
            return [...newEvents, ...prev].sort((a, b) => b.ledger - a.ledger).slice(0, 50);
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching Soroban events:", error);
        setLoading(false);
      }
    };

    // Initial poll
    pollEvents();

    // Poll every 10 seconds (standard for Testnet ledger times)
    pollInterval = setInterval(pollEvents, 10000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return { events, loading };
};
