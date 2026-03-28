export interface WeatherCondition {
  latitude: number;
  longitude: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  temperature: number;
  humidity: number;
  forecastTime: Date;
  isFireWeatherWarning: boolean;
}
