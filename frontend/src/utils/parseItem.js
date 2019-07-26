const ITEM_WEAR = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS'
}

const COLORS = {
  legendary: '#FFD700',
  covert: '#eb4b4b',
  classified: '#d32ee6',
  restricted: '#8847ff',
  'mil-spec': '#4b69ff',

  exotic: '#eb4b4b',
  epic: '#d32ee6',
  rare: '#8847ff',
  uncommon: '#4b69ff',
  common: '#9abaeb'
}

export default function(item) {
  // get skin
  var regex = item.name.match(/(StatTrak™ )?(.+) \| (.+) \((.+)\)$/)

  if (item.attributes && item.attributes.rarity) item.rarity = item.attributes.rarity

  if(!item.rarity && item.attributes && !item.attributes.rarity) item.rarity = 'Common'

  let odds
  if (item.odds) {
    odds = parseFloat(item.odds)
  } else {
    let rarityOrKnife =
      (item.type && item.type.toLowerCase()) === 'knife' ? item.type.toLowerCase() : item.rarity.toLowerCase()
    if (item.rarity.toLowerCase() === 'legendary') rarityOrKnife = 'legendary'

    if (ODDS[item.caseId]) {
      odds = ODDS[item.caseId][rarityOrKnife || 'mil-spec']
    }

    if (!odds) {
      switch (item.rarity.toLowerCase()) {
        // vGO
        case 'legendary':
          odds = 0.0001
          break
        case 'covert':
          odds = 0.0013
          break
        case 'classified':
          odds = 1.1765
          break
        case 'restricted':
          odds = 3.6058
          break
        case 'mil-spec':
          odds = 12.9574
          break

        // vIRL
        case 'exotic':
          odds = 0.0001
          break
        case 'epic':
          odds = 0.02066
          break
        case 'rare':
          odds = 2.16993
          break
        case 'uncommon':
          odds = 5.193
          break
        case 'common':
          odds = 92.1099
          break

        default:
          odds = 0
          break
      }
    }
  }

  let url
  if (!item.type) {
    url = item.image['300px'] + '/300x300'
  }

  return {
    id: item.id,
    sku: item.sku || null,
    name: item.name,
    weapon: regex && regex[2] ? regex[2] : null,
    skin: regex && regex[3] ? regex[3] : null,
    wear: regex && regex[4] ? regex[4] : null,
    wearShort: regex && regex[4] ? ITEM_WEAR[regex[4]] : null,
    url: url || item.image['300px'],
    urlLarge: item.image['600px'],
    type: (item.type && item.type.toLowerCase()) || null,
    rarity: item.rarity.toLowerCase(),
    category: (item.category && item.category.toLowerCase()) || null,
    color: COLORS[item.rarity.toLowerCase()] || item.color,
    price: item.suggested_price_floor,
    instant_sell_price: !item.instant_sell_prices ? null : item.instant_sell_prices.op,
    instant_sell_expires: !item.instant_sell_expires ? null : item.instant_sell_expires,
    odds,
    // unboxed
    inspect_urls: item.preview_urls,
    float: item.wear,
    eth_inspect: item.eth_inspect
  }
}

const ODDS = {
  1: {
    legendary: 0,
    knife: 0.09655956195,
    covert: 0.6025316666,
    classified: 12.03423057,
    restricted: 23.51743086,
    'mil-spec': 63.75310973
  },
  2: {
    legendary: 0.0000006405472567,
    knife: 0.03174275389,
    covert: 0.6649570199,
    classified: 3.52952833,
    restricted: 18.02941986,
    'mil-spec': 77.74562174
  },
  3: {
    legendary: 0.0001854645719,
    knife: 0.5166115651,
    covert: 0.02066446261,
    classified: 2.169935492,
    restricted: 5.193008014,
    'mil-spec': 92.10992723
  },
  4: {
    legendary: 0.0001991534424,
    knife: 0.08986191915,
    covert: 0.3856776422,
    classified: 5.545918202,
    restricted: 22.07392469,
    'mil-spec': 71.90621563
  },
  5: {
    legendary: 0.0009129821089,
    knife: 0.494090214,
    covert: 0.494090214,
    classified: 2.136378135,
    restricted: 5.11269981,
    'mil-spec': 91.78653316
  },
  6: {
    legendary: null,
    knife: null,
    covert: null,
    classified: null,
    restricted: null,
    'mil-spec': null
  },
  7: {
    legendary: 0.00041799999999999997,
    knife: 2.0219419999999997,
    covert: 0.6470220000000001,
    classified: 4.490068,
    restricted: 23.51743086,
    'mil-spec': 63.75310973
  }
}
