// Paint Man used to publish its own shade codes (PM-101 … PM-2211, 167 shades) at /colours/<code>.
// They were retired in favour of the brands' own shade cards: each one maps to the nearest Asian Paints
// shade by OKLab distance, and src/proxy.ts answers the old URL with a 308 to the colour finder
// searching that code. Never reuse a PM code for anything else; this map only ever shrinks.

/** The brand every legacy code maps to (a brand slug in src/data/paintdb.json). */
export const LEGACY_SHADE_BRAND = "asian-paints";

/** Legacy Paint Man code (upper case) → the nearest Asian Paints shade-card code. */
export const legacyShades: Readonly<Record<string, string>> = {
  "PM-101": "L146", "PM-102": "M0950", "PM-103": "L140", "PM-104": "L107", "PM-201": "8771", "PM-202": "8298", "PM-203": "K123", "PM-204": "8504",
  "PM-205": "8254", "PM-301": "X166", "PM-302": "X111", "PM-303": "7912", "PM-304": "9963", "PM-401": "9937", "PM-402": "K194", "PM-403": "0362",
  "PM-404": "8103", "PM-501": "7678", "PM-502": "8386", "PM-503": "7682", "PM-504": "7541", "PM-601": "7273", "PM-602": "7303", "PM-603": "9642",
  "PM-604": "9651", "PM-701": "K014", "PM-702": "K232", "PM-703": "8142", "PM-801": "8093", "PM-802": "X173", "PM-803": "9722", "PM-804": "X162",
  "PM-1001": "L161", "PM-1002": "8220", "PM-1003": "8299", "PM-1004": "8426", "PM-1101": "L161", "PM-1102": "7212", "PM-1103": "7227", "PM-1104": "8274",
  "PM-1105": "K085", "PM-1106": "K077", "PM-1107": "K106", "PM-1108": "8287", "PM-1109": "K296", "PM-1110": "K294", "PM-1111": "8253", "PM-1201": "L146",
  "PM-1202": "0989", "PM-1203": "0940", "PM-1204": "9530", "PM-1205": "0470", "PM-1206": "8495", "PM-1207": "8494", "PM-1208": "8477", "PM-1209": "8493",
  "PM-1210": "8749", "PM-1301": "7875", "PM-1302": "7905", "PM-1303": "7831", "PM-1304": "9857", "PM-1305": "9868", "PM-1306": "9865", "PM-1307": "X224",
  "PM-1308": "K167", "PM-1309": "9824", "PM-1310": "K164", "PM-1311": "8253", "PM-1401": "L145", "PM-1402": "8026", "PM-1403": "9964", "PM-1404": "9919",
  "PM-1405": "X111", "PM-1406": "X112", "PM-1407": "9907", "PM-1408": "X196", "PM-1409": "K230", "PM-1410": "9987", "PM-1411": "8253", "PM-1501": "8100",
  "PM-1502": "8067", "PM-1503": "8065", "PM-1504": "8064", "PM-1505": "8046", "PM-1506": "8021", "PM-1507": "0506", "PM-1508": "0520", "PM-1509": "8117",
  "PM-1510": "9987", "PM-1511": "8253", "PM-1601": "8100", "PM-1602": "8098", "PM-1603": "8097", "PM-1604": "8088", "PM-1605": "8127", "PM-1606": "8126",
  "PM-1607": "9584", "PM-1608": "X132", "PM-1609": "X133", "PM-1610": "X162", "PM-1611": "8253", "PM-1701": "8100", "PM-1702": "M0740", "PM-1703": "9609",
  "PM-1704": "9602", "PM-1705": "9616", "PM-1706": "9617", "PM-1707": "7158", "PM-1708": "X180", "PM-1709": "7157", "PM-1710": "9623", "PM-1711": "9648",
  "PM-1801": "L161", "PM-1802": "M0740", "PM-1803": "K084", "PM-1804": "9649", "PM-1805": "7328", "PM-1806": "7327", "PM-1807": "7326", "PM-1808": "X195",
  "PM-1809": "9647", "PM-1810": "9642", "PM-1811": "9655", "PM-1901": "M266", "PM-1902": "9688", "PM-1903": "7506", "PM-1904": "7441", "PM-1905": "9702",
  "PM-1906": "7502", "PM-1907": "9704", "PM-1908": "9692", "PM-1909": "7453", "PM-1910": "7477", "PM-1911": "K099", "PM-2001": "M266", "PM-2002": "9761",
  "PM-2003": "7656", "PM-2004": "7655", "PM-2005": "9311", "PM-2006": "X176", "PM-2007": "9775", "PM-2008": "9765", "PM-2009": "X155", "PM-2010": "9750",
  "PM-2011": "9733", "PM-2101": "7916", "PM-2102": "2353", "PM-2103": "7729", "PM-2104": "7720", "PM-2105": "7719", "PM-2106": "7718", "PM-2107": "9805",
  "PM-2108": "9845", "PM-2109": "9815", "PM-2110": "K155", "PM-2111": "8253", "PM-2201": "L145", "PM-2202": "8026", "PM-2203": "9963", "PM-2204": "8008",
  "PM-2205": "8007", "PM-2206": "8607", "PM-2207": "8598", "PM-2208": "K201", "PM-2209": "9939", "PM-2210": "K218", "PM-2211": "8253",
};

/**
 * The Asian Paints code for a legacy Paint Man code; undefined for anything else. Accepts every form
 * the old shade pages did, in any case: "PM-502", "pm-502", "PM502", "PM 502" and the bare "502".
 */
export function legacyShadeCode(code: string): string | undefined {
  const m = /^(?:PM[\s-]*)?(\d{3,4})$/.exec(code.trim().toUpperCase());
  const key = m ? `PM-${m[1]}` : "";
  return Object.hasOwn(legacyShades, key) ? legacyShades[key] : undefined;
}
