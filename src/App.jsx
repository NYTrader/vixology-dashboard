import { useState, useEffect } from "react";

const FINNHUB_KEY = "d6jl1apr01qkvh5qbt6gd6jl1apr01qkvh5qbt70";
const FINNHUB = "https://finnhub.io/api/v1";
const WORKER  = "https://solitary-breeze-63fa.vadim-iosilevich.workers.dev";

const WORKER_TICKERS = ["^VIX","^VXN","^VVIX","^MOVE","^TNX","^TYX"];

const ETF_TICKERS = [
  "SPY","DIA","QQQ","ONEQ","IWM",
  "VGK","ILF","EWJ","FXI","INDA","EEM",
  "AGG","TLT","IEF","LQD","HYG",
  "IBIT","ETHA",
  "SVIX","SVXY","VIXY","VXX","UVXY","UVIX","SVOL","VYLD",
];

const DEC31 = {
  SPY: 681.92, DIA: 445.29, QQQ: 614.31, ONEQ: 230.79, IWM: 218.19,
  VGK: 72.70,  ILF: 25.47,  EWJ: 73.43,  FXI: 33.64,  INDA: 47.08, EEM: 43.57,
  "^TNX": 4.57, "^TYX": 4.78,
  AGG: 96.67, TLT: 84.12, IEF: 93.82, LQD: 107.76, HYG: 78.57,
  IBIT: 54.04, ETHA: 23.15,
  "^VIX": 17.35, "^VXN": 20.24, "^VVIX": 98.62, "^MOVE": 89.21,
  SVIX: 23.48, SVXY: 57.36, VIXY: 11.89, VXX: 42.86,
  UVXY: 14.73, UVIX: 2.87,  SVOL: 23.02, VYLD: 26.31,
};

const SECTIONS = [
  { title: "US Equities", items: [
    { label: "S&P 500",           ticker: "SPY",   type: "etf" },
    { label: "Dow Industrials",   ticker: "DIA",   type: "etf" },
    { label: "Nasdaq 100",        ticker: "QQQ",   type: "etf" },
    { label: "Nasdaq Comp",       ticker: "ONEQ",  type: "etf" },
    { label: "Russell 2K Sm Cap", ticker: "IWM",   type: "etf" },
  ]},
  { title: "International Equities", items: [
    { label: "Europe",           ticker: "VGK",  type: "etf" },
    { label: "Latin America",    ticker: "ILF",  type: "etf" },
    { label: "Japan",            ticker: "EWJ",  type: "etf" },
    { label: "China",            ticker: "FXI",  type: "etf" },
    { label: "India",            ticker: "INDA", type: "etf" },
    { label: "Emerging Markets", ticker: "EEM",  type: "etf" },
  ]},
  { title: "US Fixed Income", items: [
    { label: "10-Yr Treasury Rate", ticker: "^TNX", type: "rate" },
    { label: "30-Yr Treasury Rate", ticker: "^TYX", type: "rate" },
    { label: "Aggregate Index",     ticker: "AGG",  type: "etf"  },
    { label: "LT Treasuries",       ticker: "TLT",  type: "etf"  },
    { label: "Med Term Treasuries", ticker: "IEF",  type: "etf"  },
    { label: "IG Corporate",        ticker: "LQD",  type: "etf"  },
    { label: "High Yield",          ticker: "HYG",  type: "etf"  },
  ]},
  { title: "Crypto", items: [
    { label: "Bitcoin ETF",  ticker: "IBIT", type: "etf" },
    { label: "Ethereum ETF", ticker: "ETHA", type: "etf" },
  ]},
  { title: "Volatility", items: [
    { label: "VIX (S&P 500)",     ticker: "^VIX",  type: "vix" },
    { label: "VXN (Nas 100)",     ticker: "^VXN",  type: "vix" },
    { label: "VVIX (Vol of Vol)", ticker: "^VVIX", type: "vix" },
    { label: "MOVE (Bond Vol)",   ticker: "^MOVE", type: "vix" },
  ]},
  { title: "Volatility ETPs", items: [
    { label: "1x Inverse",          ticker: "SVIX", type: "etf" },
    { label: ".5x Inverse",         ticker: "SVXY", type: "etf" },
    { label: "1x Long",             ticker: "VIXY", type: "etf" },
    { label: "1x Long",             ticker: "VXX",  type: "etf" },
    { label: "1.5x Long",           ticker: "UVXY", type: "etf" },
    { label: "2x Long",             ticker: "UVIX", type: "etf" },
    { label: "Volatility Premium",  ticker: "SVOL", type: "etf" },
    { label: "Inverse VIX Futures", ticker: "VYLD", type: "etf" },
  ]},
];

function getET() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
}
function todayCloseAvailable() {
  const et = getET();
  const d = et.getDay();
  return d !== 0 && d !== 6 && et.getHours() >= 17;
}
function lastTradingDayLabel() {
  const et = getET();
  const d = new Date(et);
  if (!todayCloseAvailable()) d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

async function fetchETFs() {
  const results = {};
  const BATCH = 10;
  for (let i = 0; i < ETF_TICKERS.length; i += BATCH) {
    const batch = ETF_TICKERS.slice(i, i + BATCH);
    await Promise.all(batch.map(async ticker => {
      try {
        const res = await fetch(`${FINNHUB}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`);
        if (!res.ok) return;
        const d = await res.json();
        const price = todayCloseAvailable() ? (d.c || d.pc) : d.pc;
        if (price && price !== 0) results[ticker] = price;
      } catch (e) { console.warn(`ETF ${ticker}:`, e.message); }
    }));
    if (i + BATCH < ETF_TICKERS.length) await new Promise(r => setTimeout(r, 600));
  }
  return results;
}

async function fetchIndices() {
  const results = {};
  await Promise.all(WORKER_TICKERS.map(async ticker => {
    try {
      const res = await fetch(`${WORKER}/?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) return;
      const text = await res.text();
      const d = JSON.parse(text);
      if (d?.price != null) results[ticker] = d.price;
    } catch (e) { console.warn(`Index ${ticker}:`, e.message); }
  }));
  return results;
}

async function fetchAllPrices() {
  const [etfs, indices] = await Promise.all([fetchETFs(), fetchIndices()]);
  return { ...etfs, ...indices };
}

function fmtPrice(v, type) {
  if (v == null) return "—";
  if (type === "rate") return v.toFixed(2) + "%";
  if (type === "vix")  return v.toFixed(2);
  return "$ " + v.toFixed(2);
}

const BASE_TD = { fontSize: 12.5, padding: "5px 6px", borderBottom: "1px solid rgba(28,58,112,.1)" };
const BASE_TH = { fontFamily: "'Merriweather', serif", fontSize: 11, fontWeight: 700, color: "#bf9c3a", padding: "6px 6px", borderBottom: "1px solid #1c3a70", background: "#0b1e3d" };
const COLS = { tkr: 72, cur: 110, ref: 116, chg: 88 };

function ChangeCell({ cur, base, type }) {
  const s = { ...BASE_TD, textAlign: "right", fontVariantNumeric: "tabular-nums", paddingRight: 14 };
  if (cur == null || base == null) return <td style={s}>—</td>;
  const diff = (type === "rate" || type === "vix") ? cur - base : ((cur - base) / base) * 100;
  const inv   = type === "rate" || type === "vix";
  const color = diff > 0 ? (inv ? "#c0392b" : "#27ae60") : diff < 0 ? (inv ? "#27ae60" : "#c0392b") : "#666";
  const label = (type === "rate" && diff < 0)
    ? `(${Math.abs(diff).toFixed(2)})`
    : (diff > 0 ? "+" : "") + diff.toFixed(2) + (type === "etf" ? "%" : "");
  return <td style={{ ...s, color, fontWeight: 700 }}>{label}</td>;
}

export default function App() {
  const [prices,    setPrices]    = useState({});
  const [status,    setStatus]    = useState("loading");
  const [closeDate, setCloseDate] = useState(lastTradingDayLabel());
  const [fetchedAt, setFetchedAt] = useState(null);

  async function doFetch() {
    setStatus("loading");
    try {
      const data = await fetchAllPrices();
      if (Object.keys(data).length < 3) throw new Error("Too few results");
      setPrices(data);
      setCloseDate(lastTradingDayLabel());
      setFetchedAt(new Date());
      setStatus("live");
    } catch (err) {
      console.warn("Fetch failed:", err.message);
      setStatus("error");
    }
  }

  useEffect(() => { doFetch(); }, []);

  const isLoading = status === "loading";
  const isLive    = status === "live";
  const isError   = status === "error";
  const dotColor  = isLive ? "#27ae60" : isError ? "#e67e22" : "#3d72c4";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,700;0,900;1,700&family=Source+Sans+3:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07101e; min-height: 100vh; display: flex; justify-content: center; padding: 24px 12px; }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .pulse   { animation: blink 2s infinite; }
        .shimbar { height:2px; background:linear-gradient(90deg,transparent,#1c3a70,#6da0f5,#1c3a70,transparent); background-size:200% 100%; animation:shimmer 1.2s linear infinite; border-left:2px solid #1c3a70; border-right:2px solid #1c3a70; }
        .spinner { width:16px; height:16px; border-radius:50%; border:2px solid #1c3a70; border-top-color:#3d72c4; animation:spin .8s linear infinite; }
        tr.row:nth-child(even) td { background: rgba(11,30,61,.3); }
        tr.row:hover td { background: rgba(28,58,112,.2) !important; }
      `}</style>

      <div style={{ width:"100%", maxWidth:690, margin:"0 auto", fontFamily:"'Source Sans 3',sans-serif", background:"#07101e" }}>

        <div style={{ background:"linear-gradient(160deg,#0b1e3d,#142a4e 60%,#0b1e3d)", border:"2px solid #1c3a70", borderBottom:"none", borderRadius:"5px 5px 0 0", padding:"18px 20px 14px", textAlign:"center" }}>
          <div style={{ fontFamily:"'Merriweather',serif", fontSize:23, fontWeight:900, letterSpacing:4, color:"#d4e4ff", textTransform:"uppercase" }}>Vixology YTD Recap</div>
          <div style={{ fontFamily:"'Merriweather',serif", fontSize:12, fontWeight:700, color:"#bf9c3a", letterSpacing:2, marginTop:3, textTransform:"uppercase" }}>
            Year-to-Date · {new Date().getFullYear()}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10, fontSize:11, color:"#526a8e" }}>
            <span>
              <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", marginRight:5, verticalAlign:"middle", background:dotColor, boxShadow:isLive?"0 0 5px #27ae60":"none" }} className={isLive?"pulse":""}></span>
              {isLive    && `${todayCloseAvailable() ? "Today's" : "Prev day's"} close · ${fetchedAt?.toLocaleTimeString()}`}
              {isError   && "Fetch failed — try refreshing"}
              {isLoading && "Fetching prices…"}
            </span>
            <button
              onClick={doFetch}
              disabled={isLoading}
              style={{ background:"rgba(28,58,112,.35)", border:"1px solid #1c3a70", color:"#526a8e", padding:"3px 10px", borderRadius:3, cursor:isLoading?"not-allowed":"pointer", fontSize:11, opacity:isLoading?0.5:1 }}
            >
              {isLoading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {isLoading && <div className="shimbar" />}

        {isLoading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:32, gap:10, color:"#2e4a70", fontSize:12, fontStyle:"italic", borderLeft:"2px solid #1c3a70", borderRight:"2px solid #1c3a70" }}>
            <div className="spinner"></div>
            <span>Fetching closing prices…</span>
          </div>
        )}

        {isError && (
          <div style={{ borderLeft:"2px solid #1c3a70", borderRight:"2px solid #1c3a70", background:"rgba(230,126,34,.07)", padding:"10px 14px", fontSize:11.5, color:"#a06020", borderTop:"1px solid rgba(230,126,34,.2)", textAlign:"center" }}>
            Could not load prices. Please try refreshing.
          </div>
        )}

        {!isLoading && SECTIONS.map(section => (
          <div key={section.title} style={{ borderLeft:"2px solid #1c3a70", borderRight:"2px solid #1c3a70" }}>
            <div style={{ background:"rgba(11,30,61,.65)", padding:"5px 14px", fontFamily:"'Merriweather',serif", fontStyle:"italic", fontSize:12, fontWeight:700, color:"#1c5fad", borderTop:"1px solid rgba(28,58,112,.35)" }}>
              {section.title}
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
              <colgroup>
                <col /><col style={{ width:COLS.tkr }} /><col style={{ width:COLS.cur }} /><col style={{ width:COLS.ref }} /><col style={{ width:COLS.chg }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...BASE_TH, textAlign:"left", paddingLeft:14 }}>Name</th>
                  <th style={{ ...BASE_TH, textAlign:"right" }}>Ticker</th>
                  <th style={{ ...BASE_TH, textAlign:"right", color:"#6da0f5" }}>{isLive ? closeDate : "—"}</th>
                  <th style={{ ...BASE_TH, textAlign:"right" }}>Dec 31, 2025</th>
                  <th style={{ ...BASE_TH, textAlign:"right", paddingRight:14 }}>YTD Chg</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map(item => {
                  const cur  = prices[item.ticker] ?? null;
                  const base = DEC31[item.ticker]  ?? null;
                  return (
                    <tr key={item.ticker + item.label} className="row">
                      <td style={{ ...BASE_TD, paddingLeft:14, color:"#8aa6c4", fontWeight:600 }}>{item.label}</td>
                      <td style={{ ...BASE_TD, textAlign:"right", color:"#2e5fb3", fontWeight:700, fontSize:11, fontFamily:"monospace" }}>{item.ticker}</td>
                      <td style={{ ...BASE_TD, textAlign:"right", color:"#6da0f5", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{fmtPrice(cur, item.type)}</td>
                      <td style={{ ...BASE_TD, textAlign:"right", color:"#4a6282", fontVariantNumeric:"tabular-nums" }}>{fmtPrice(base, item.type)}</td>
                      <ChangeCell cur={cur} base={base} type={item.type} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ background:"#07101e", border:"2px solid #1c3a70", borderTop:"1px solid rgba(28,58,112,.25)", borderRadius:"0 0 5px 5px", padding:"9px 14px" }}>
          <p style={{ fontSize:10.5, color:"#2e4260", fontStyle:"italic", lineHeight:1.6 }}>* Volatility measures (VIX, VXN, VVIX, MOVE) change in points; ETFs in percent.</p>
          <p style={{ fontSize:10.5, color:"#2e4260", fontStyle:"italic", lineHeight:1.6 }}>* Before 5pm ET shows previous close; after 5pm ET shows today's close. Dec 31, 2025 is the year-end reference.</p>
        </div>

      </div>
    </>
  );
}
