import { useEffect } from 'react';
import { RealtimeClient } from '../../lib/realtime';
import { useWorldStore } from './world-store';

/** Opens the world connection for the given character while the component is mounted. */
export function useWorldConnection(characterId: string | null): void {
  useEffect(() => {
    if (!characterId) return;
    const { receive, setStatus, reset, setSender } = useWorldStore.getState();
    reset();
    const client = new RealtimeClient({
      onMessage: receive,
      onStatus: setStatus,
      // Re-enter the world after every (re)connection.
      onReady: (send) => send({ type: 'world.enter', data: { characterId } }),
    });
    client.connect();
    setSender((msg) => client.send(msg));
    return () => {
      client.disconnect();
      setSender(null);
      reset();
    };
  }, [characterId]);
}
