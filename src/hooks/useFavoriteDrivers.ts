import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, addDoc } from 'firebase/firestore';

export interface FavoriteDriver {
  id: string;
  driverId: string;
  name?: string;
  avatarUrl?: string;
  vehicleInfo?: string;
  customId?: string;
}

export function useFavoriteDrivers(userId: string | undefined | null) {
  const [favoriteDrivers, setFavoriteDrivers] = useState<FavoriteDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !userId) {
      setFavoriteDrivers([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const favRef = collection(db, 'users', userId, 'favoriteDrivers');
    const unsubscribe = onSnapshot(
      favRef,
      async (snapshot) => {
        const favs: FavoriteDriver[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (!data) continue;
          
          const driverId = data.driverId;
          if (!driverId) continue;
          
          let name = data.name;
          let avatarUrl = data.avatarUrl;
          let vehicleInfo = data.vehicleInfo;
          // Optionally fetch driver details from main users collection
          if ((!name || !avatarUrl || !vehicleInfo) && db) {
            try {
              const driverDoc = await getDoc(doc(db, 'users', driverId));
              if (driverDoc.exists()) {
                const driverData = driverDoc.data();
                if (driverData) {
                  name = name || driverData.name;
                  avatarUrl = avatarUrl || driverData.avatarUrl;
                  vehicleInfo = vehicleInfo || (driverData.vehicleMakeModel ? driverData.vehicleMakeModel : '') + (driverData.vehicleRegistration ? ` - ${driverData.vehicleRegistration}` : '');
                  // Fetch customId (OP001/DR...)
                  var customId = driverData.customId || driverData.driverIdentifier || '';
                }
              }
            } catch {}
          }
          favs.push({ id: docSnap.id, driverId, name, avatarUrl, vehicleInfo, customId });
        }
        setFavoriteDrivers(favs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  return { favoriteDrivers, loading, error };
}

export async function addFavoriteDriver(userId: string, driverId: string, driverName?: string) {
  if (!db || !userId || !driverId) throw new Error('Missing user or driver ID');
  const favRef = collection(db, 'users', userId, 'favoriteDrivers');
  await addDoc(favRef, { driverId, name: driverName || '' });
} 