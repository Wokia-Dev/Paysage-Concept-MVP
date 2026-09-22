export interface WeatherInfo {
  temperature: number;
  weatherCode: number;
  description: string;
  iconName: 'sun' | 'cloud' | 'cloud-rain' | 'cloud-snow' | 'cloud-lightning';
  windSpeed?: number;
}

export function getWeatherDescription(code: number): { description: string; iconName: WeatherInfo['iconName'] } {
  if (code === 0) return { description: 'Ensoleillé', iconName: 'sun' };
  if (code === 1 || code === 2) return { description: 'Éclaircies', iconName: 'cloud' };
  if (code === 3) return { description: 'Couvert', iconName: 'cloud' };
  if (code >= 45 && code <= 48) return { description: 'Brume / Brouillard', iconName: 'cloud' };
  if (code >= 51 && code <= 67) return { description: 'Pluie fine', iconName: 'cloud-rain' };
  if (code >= 71 && code <= 77) return { description: 'Neige', iconName: 'cloud-snow' };
  if (code >= 80 && code <= 82) return { description: 'Averses', iconName: 'cloud-rain' };
  if (code >= 95) return { description: 'Orages', iconName: 'cloud-lightning' };
  return { description: 'Variable', iconName: 'cloud' };
}

/**
 * Récupère la météo en direct du chantier via Open-Meteo (sans clé API).
 * Si hors-ligne ou erreur, renvoie une valeur par défaut cohérente.
 */
export async function fetchChantierWeather(
  latitude = 45.8166,
  longitude = 4.7983
): Promise<WeatherInfo> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('Météo indisponible');
    const data = await res.json();

    const temp = Math.round(data.current?.temperature_2m ?? 18);
    const code = Number(data.current?.weather_code ?? 1);
    const wind = Math.round(data.current?.wind_speed_10m ?? 12);
    const { description, iconName } = getWeatherDescription(code);

    return {
      temperature: temp,
      weatherCode: code,
      description,
      iconName,
      windSpeed: wind,
    };
  } catch {
    // Fallback hors-ligne
    return {
      temperature: 19,
      weatherCode: 1,
      description: 'Partiellement nuageux (hors-ligne)',
      iconName: 'cloud',
      windSpeed: 10,
    };
  }
}
