import { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server } from '../config/stellar';

export function useSorobanEvents(contractId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId;
    let latestLedger = 0;

    const fetchEvents = async () => {
      try {
        // Get current ledger
        const ledger = await server.getLatestLedger();
        const currentLedger = ledger.sequence;

        // Only fetch if ledger has advanced
        if (currentLedger > latestLedger) {
          const startLedger = Math.max(latestLedger || currentLedger - 100, 1);
          
          console.log(`📡 Fetching events from ledger ${startLedger} to ${currentLedger}`);

          const response = await server.getEvents({
            startLedger: startLedger,
            filters: [
              {
                type: 'contract',
                contractIds: [contractId]
              }
            ]
          });

          if (response.events && response.events.length > 0) {
            console.log(`✅ Found ${response.events.length} new events`);
            
            setEvents(prev => {
              const newEvents = response.events.filter(
                e => !prev.find(p => p.id === e.id)
              );
              // Format events for UI
              const formatted = newEvents.map(e => ({
                id: e.id,
                ledger: e.ledger,
                type: e.type,
                contractId: e.contractId,
                // Add more metadata if needed
              }));
              return [...formatted, ...prev].slice(0, 100); // Keep last 100
            });
          }

          latestLedger = currentLedger;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchEvents();

    // Then poll every 5 seconds (Production recommendation)
    intervalId = setInterval(fetchEvents, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [contractId]);

  return { events, loading };
}
