/* eslint-disable no-console */
import fetch from 'isomorphic-fetch';
import { normalize as normalizeICO } from 'lib/icos';
import icoData from 'lib/ico-data';
import { fetchEthPriceAtDate } from 'lib/cryptowatch';
import { fetchCurrentPrice } from 'lib/gdax';
import { cache } from 'app';
import EthPrice from 'models/eth-price';
import BtcPrice from 'models/btc-price';
import { sendMail } from 'lib/mail';

export default {
  Query: {
    async icos() {
      const promises = icoData.map(async (data) => {
        const url = `https://api.coinmarketcap.com/v1/ticker/${data.ticker}/`;
        const response = await fetch(url);
        let json = await response.json();

        // Try to get ETH price on ICO launch day
        // NOTE: GDAX does not have history before a ceertain date
        const minGdaxDate = new Date('05/25/2016');

        if (
          !data.eth_price_at_launch &&
          data.start_date &&
          (new Date(data.start_date)) > minGdaxDate
        ) {
          console.log('Fetched eth price at launch for %s', data.name);
          const price = await fetchEthPriceAtDate(data.start_date);

          json.eth_price_at_launch = price;
        }

        if (Array.isArray(json)) {
          json = json[0];
        }

        return {
          ...data,
          ...json,
          // This one conflicts
          id: data.id
        };
      });
      const results = await Promise.all(promises);

      // Get the current ETH price
      let ethPrice = cache.get('ethPrice');
      let btcPrice = cache.get('btcPrice');

      if (!ethPrice) {
        try {
          ethPrice = await fetchCurrentPrice('ETH');
        } catch (e) {
          const latest = await EthPrice.findOne().sort('-timestamp');

          ethPrice = latest.usd_price;
          console.log('Fetched fallback ETH price (%s) from db.', ethPrice);
        }
        cache.set('ethPrice', ethPrice);
      }

      if (!btcPrice) {
        try {
          btcPrice = await fetchCurrentPrice('BTC');
        } catch (e) {
          const latest = await BtcPrice.findOne().sort('-timestamp');

          btcPrice = latest.usd_price;
          console.log('Fetched fallback BTC price (%s) from db.', btcPrice);
        }
        cache.set('btcPrice', btcPrice);
      }

      return results.map(ico => normalizeICO(ico, ethPrice, btcPrice));
    },
    async ico(obj, { id }) {
      const url = `https://api.coinmarketcap.com/v1/ticker/${id}/`;
      const response = await fetch(url);
      const json = await response.json();
      const data = Array.isArray(json) ? json[0] : json;

      return normalizeICO(data);
    }
  },
  Mutation: {
    async sendMail(_, { name, email, message }) {
      const success = await sendMail(name, email, message);

      return success ? 'success' : 'failed';
    }
  }
};
