export interface GeoCoordinates {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
}

/**
 * Tente d'obtenir la position GPS avec un timeout court (2.5 secondes).
 * Ne lève jamais d'exception afin de ne jamais bloquer l'ouvrier lors d'un pointage.
 */
export async function getQuickGeolocation(timeoutMs = 2500): Promise<GeoCoordinates> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { latitude: null, longitude: null };
  }

  return new Promise<GeoCoordinates>((resolve) => {
    let hasResolved = false;

    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({ latitude: null, longitude: null });
      }
    }, timeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timer);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          }
        },
        () => {
          // Si refusé, indisponible ou erreur signal GPS
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timer);
            resolve({ latitude: null, longitude: null });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 60000, // Accepte une position en cache datant de moins d'1 minute
        }
      );
    } catch {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(timer);
        resolve({ latitude: null, longitude: null });
      }
    }
  });
}
