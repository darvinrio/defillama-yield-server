const axios = require('axios');
const sdk = require('@defillama/sdk');

const abi = require('./abi.json');

const rswETH = '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0';

const apy = async () => {
  const totalSupply =
    (
      await sdk.api.abi.call({
        target: rswETH,
        abi: abi.find((m) => m.name === 'totalSupply'),
      })
    ).output / 1e18;

  
  const now = Math.floor(Date.now() / 1000);

  const last_update = (
    await sdk.api.abi.call({
      target: rswETH,
      abi: abi.find((m) => m.name === 'lastRepriceUNIX'),
    })
  ).output;
  const last_time = last_update - 24 // ensure atleast 1 block before last update
  const timestamp7dayAgo = now - 86400 * 7;

  const block1dayAgo = (
    await axios.get(`https://coins.llama.fi/block/ethereum/${last_time}`)
  ).data.height;
  const block7dayAgo = (
    await axios.get(`https://coins.llama.fi/block/ethereum/${timestamp7dayAgo}`)
  ).data.height;

  const exchangeRates = await Promise.all([
    sdk.api.abi.call({
      target: rswETH,
      abi: abi.find((m) => m.name === 'getRate'),
    }),
    sdk.api.abi.call({
      target: rswETH,
      abi: abi.find((m) => m.name === 'getRate'),
      block: block1dayAgo,
    }),
    sdk.api.abi.call({
      target: rswETH,
      abi: abi.find((m) => m.name === 'getRate'),
      block: block7dayAgo,
    }),
  ]);

  const date_delta = (now - last_time) / 86400
  const apr1d =
    ((exchangeRates[0].output - exchangeRates[1].output) / 1e18 / date_delta) * 365 * 100;

  const apr7d =
    ((exchangeRates[0].output - exchangeRates[2].output) / 1e18 / 7) * 365 * 100;

  const priceKey = `ethereum:${rswETH}`;
  const ethPrice = (
    await axios.get(`https://coins.llama.fi/prices/current/${priceKey}`)
  ).data.coins[priceKey].price;

  const rate = exchangeRates[0].output/1e18
  const tvlUsd = totalSupply * rate * ethPrice;

  return [
    {
      pool: rswETH,
      project: 'swell-liquid-restaking',
      chain: 'Ethereum',
      symbol: 'rswETH',
      tvlUsd: tvlUsd,
      apyBase: apr1d,
      apyBase7d: apr7d,
      underlyingTokens: ['0x0000000000000000000000000000000000000000'],
    },
  ];
};

module.exports = {
  apy,
  url: 'https://app.swellnetwork.io/stake/rsweth',
};