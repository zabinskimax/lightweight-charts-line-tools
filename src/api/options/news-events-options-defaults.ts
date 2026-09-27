import { NewsEventsOptions } from '../inews-events-api';

export const newsEventsOptionsDefaults: NewsEventsOptions = {
	visible: true,
	colors: {
		high: '#ef5350',
		medium: '#ffa726',
		low: '#29b6f6',
	},
	iconSize: 14,
	bottomMargin: 4,
	upcomingOpacity: 0.5,
	currencyPriority: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY'],
	guideLine: true,
};
