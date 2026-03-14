//+------------------------------------------------------------------+
//|                                              ClevrEdge.mq4        |
//|                     Every-Bar Scalp | AW Recovery                |
//+------------------------------------------------------------------+
#property copyright "ClevrEdge v2.0"
#property link      ""
#property version   "2.00"
#property strict

//+------------------------------------------------------------------+
//| ENUMS                                                             |
//+------------------------------------------------------------------+
enum ENUM_TP_MODE
{
   TP_DOLLAR = 0,      // TP in USD ($)
   TP_PIPS   = 1       // TP in Pips
};

enum ENUM_FRIDAY_MODE
{
   FRI_NORMAL  = 0,    // Normal (trade as usual)
   FRI_NO_NEW  = 1,    // No new orders on Friday
   FRI_CUTOFF  = 2     // Stop new after cutoff time
};

enum ENUM_PNL_SCOPE
{
   PNL_THIS_EA  = 0,   // This EA only (MagicNumber)
   PNL_SYMBOL   = 1,   // All orders on this symbol
   PNL_ACCOUNT  = 2    // Whole account (all symbols)
};

//+------------------------------------------------------------------+
//| ══════ GENERAL ══════                                             |
//+------------------------------------------------------------------+
extern string         _G_              = "======= GENERAL =======";
extern int            MagicNumber      = 9244;
extern bool           AllowBuy         = true;
extern bool           AllowSell        = true;
extern bool           UsePairLock      = true;
extern string         LockFileName     = "clevredge_locked.txt";

//+------------------------------------------------------------------+
//| ══════ ORDER ══════                                               |
//+------------------------------------------------------------------+
extern string         _ORD_            = "======= ORDER =======";
extern double         StartLot         = 0.01;
extern ENUM_TP_MODE   TP_Mode          = TP_DOLLAR;
extern double         TP_Dollar        = 2.0;
extern double         TP_Pips          = 10.0;
extern double         MaxLotLimit      = 1.0;

//+------------------------------------------------------------------+
//| ══════ MARTINGALE ══════                                          |
//+------------------------------------------------------------------+
extern string         _MG_             = "======= MARTINGALE =======";
extern bool           UseMartingale    = true;          // Enable/Disable Martingale
extern double         MG_LossThreshold = 20.0;          // Loss ($) before MG entry
extern double         MG_Lot           = 0.02;           // MG Lot size

extern bool           UseTrailing      = true;
extern double         TrailStep        = 1.0;       // Trail step in USD ($)
extern bool           TrailBreakeven   = false;     // false = lock at TP level immediately

//+------------------------------------------------------------------+
//| ══════ NIGHT MODE ══════                                          |
//+------------------------------------------------------------------+
extern string         _NIGHT_          = "======= NIGHT MODE =======";
extern bool           UseNightMode     = true;
extern int            NightStartHour   = 19;
extern int            NightEndHour     = 7;
extern double         NightLot         = 0.01;

//+------------------------------------------------------------------+
//| ══════ DD / AW ══════                                             |
//+------------------------------------------------------------------+
extern string         _DD_             = "======= DD / AW =======";
extern double         MaxDD_Percent    = 100.0;
extern int            AW_MagicNumber   = 9751421;
extern double         EmergencyDD      = 50.0;
extern int            CooldownMin      = 1;       // Wait N min after close before new trade (0=off)

//+------------------------------------------------------------------+
//| ══════ LOSS CUT ══════                                            |
//+------------------------------------------------------------------+
extern string         _LC_             = "======= LOSS CUT =======";
extern double         LossCutValue     = 1000.0;

//+------------------------------------------------------------------+
//| ══════ RISK ══════                                                |
//+------------------------------------------------------------------+
extern string         _RISK_           = "======= RISK =======";
extern double         MaxSpread_Pip    = 10.0;
extern int            MarketOpenWaitMin = 30;   // Wait X minutes after XAUUSD daily open (server 01:00)
extern int            MarketCloseHour  = 22;    // Stop new orders from this server hour (0=disabled, 22=block 22:00-close)

//+------------------------------------------------------------------+
//| ══════ NEWS ══════                                                |
//+------------------------------------------------------------------+
extern string         _NEWS_           = "======= NEWS =======";
extern bool           UseNewsFilter    = true;
extern int            NewsMinsBefore   = 30;
extern int            NewsMinsAfter    = 15;
extern int            NewsSourceGMT    = -5;            // ForexFactory GMT offset (EST=-5, EDT=-4)

//+------------------------------------------------------------------+
//| ══════ FRIDAY ══════                                              |
//+------------------------------------------------------------------+
extern string         _FRI_            = "======= FRIDAY =======";
extern ENUM_FRIDAY_MODE FridayMode     = FRI_CUTOFF;
extern int            FridayCutoffHour = 23;
extern int            FridayCutoffMin  = 1;

//+------------------------------------------------------------------+
//| ══════ MONDAY ══════                                              |
//+------------------------------------------------------------------+
extern string         _MON_            = "======= MONDAY =======";
extern bool           MondayWait       = true;
extern int            MondayWaitHours  = 1;

//+------------------------------------------------------------------+
//| ══════ DAY ══════                                                 |
//+------------------------------------------------------------------+
extern string         _DAY_            = "======= TRADE DAYS =======";
extern bool           TradeMonday      = true;
extern bool           TradeTuesday     = true;
extern bool           TradeWednesday   = true;
extern bool           TradeThursday    = true;

//+------------------------------------------------------------------+
//| ══════ DISPLAY ══════                                             |
//+------------------------------------------------------------------+
extern string         _DISP_           = "======= DISPLAY =======";
extern bool           ShowDashboard    = true;
extern string         AccountLabel     = "A1";
extern ENUM_PNL_SCOPE PnL_Scope        = PNL_SYMBOL;
extern int            ServerToThai     = 4;

//+------------------------------------------------------------------+
//| INTERNALS                                                         |
//+------------------------------------------------------------------+
int      Slippage       = 50;
string   TradeComment   = "ClevrEdge";
double   g_pipDiv       = 10.0;
int      g_maxSpreadPts = 100;

//+------------------------------------------------------------------+
//| GLOBALS                                                           |
//+------------------------------------------------------------------+
datetime g_lastBar       = 0;
string   g_lastAction    = "Starting...";
bool     g_isWaitAW      = false;
double   g_dayPnL        = 0;
double   g_totalPnL      = 0;
int      g_scalpTPCount  = 0;
int      g_scalpTPDay    = 0;
// (BasketSL removed — AW Recovery EA triggers itself)
int      g_awDayCount    = 0;
int      g_lcCount       = 0;          // LossCut total
int      g_lcDayCount    = 0;          // LossCut today
int      g_awDayDate     = 0;
int      g_rcRound       = 0;
double   g_rcCurrentDD   = 0;
datetime g_awSimStart    = 0;
bool     g_emergHedged   = false;
double   g_ddPeak        = 0;
double   g_ddCurrent     = 0;
// AW Cooldown
datetime g_awCooldownEnd = 0;        // time when cooldown expires
// Martingale
bool     g_mgFired       = false;         // MG order already placed this cycle
// Trailing
bool     g_trailActive   = false;
double   g_trailLock     = 0;
// Pair Lock (no globals needed — check only at order time)
// News
datetime g_newsTime[50];
string   g_newsImpact[50];
string   g_newsTitle[50];
int      g_newsCount     = 0;
datetime g_newsLastLoad  = 0;
bool     g_newsBlock     = false;
string   g_newsStatus    = "";

//+------------------------------------------------------------------+
//| OnInit                                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   if(Digits == 2 || Digits == 3 || Digits == 5) g_pipDiv = 10.0;
   else g_pipDiv = 1.0;

   g_maxSpreadPts = (int)(MaxSpread_Pip * g_pipDiv);
   g_awDayDate    = Day();

   Print("=== ClevrEdge v2.0 ===");
   Print("Mode:", AllowBuy?" BUY":"", AllowSell?" SELL":"",
         " Lot:", StartLot, " Night:", NightLot,
         " TP:", (TP_Mode==TP_DOLLAR ? "$"+DoubleToStr(TP_Dollar,1) : DoubleToStr(TP_Pips,0)+"pip"),
         UseTrailing ? " Trail:$"+DoubleToStr(TrailStep,1) : " Trail:OFF");
   Print("MG:", UseMartingale?"ON $"+DoubleToStr(MG_LossThreshold,0)+"->"+DoubleToStr(MG_Lot,2):"OFF");
   Print("News:", UseNewsFilter?"ON":"OFF", " Before:", NewsMinsBefore, "m After:", NewsMinsAfter, "m");

   if(UseNewsFilter && !IsTesting()) LoadNews();
   if(!IsTesting()) RecoverAWState();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0, "CE_");
   Comment("");
}

//+------------------------------------------------------------------+
//| THAI TIME (GMT+7)                                                 |
//+------------------------------------------------------------------+
int GetThaiHour()
{
   MqlDateTime dt; TimeToStruct(TimeGMT() + 7 * 3600, dt);
   return dt.hour;
}

int GetThaiMinute()
{
   MqlDateTime dt; TimeToStruct(TimeGMT() + 7 * 3600, dt);
   return dt.min;
}

bool IsMarketOpenWait()
{
   if(MarketOpenWaitMin <= 0) return false;
   // XAUUSD daily open = server 01:00 (after 00:00-01:00 break)
   int serverHour = Hour();
   int serverMin  = Minute();
   int minsSinceOpen = (serverHour - 1) * 60 + serverMin;
   if(serverHour < 1) return true;   // Market still closed (00:xx)
   if(minsSinceOpen < MarketOpenWaitMin) return true;  // Within wait period
   return false;
}

bool IsMarketCloseBlock()
{
   if(MarketCloseHour <= 0) return false;
   // Block new orders from MarketCloseHour until market close (00:00)
   // 00:00-01:30 is already handled by IsMarketOpenWait()
   return (Hour() >= MarketCloseHour);
}

bool IsNightMode()
{
   if(!UseNightMode) return false;
   int h = GetThaiHour();
   if(NightStartHour > NightEndHour)
      return (h >= NightStartHour || h < NightEndHour);
   return (h >= NightStartHour && h < NightEndHour);
}

double GetBaseLot() { return IsNightMode() ? NightLot : StartLot; }

//+------------------------------------------------------------------+
//| FRIDAY BLOCK                                                      |
//+------------------------------------------------------------------+
bool IsFridayBlock()
{
   if(DayOfWeek() != 5) return false;
   if(FridayMode == FRI_NORMAL) return false;
   if(FridayMode == FRI_NO_NEW) return true;
   if(FridayMode == FRI_CUTOFF)
      return (GetThaiHour() * 60 + GetThaiMinute() >= FridayCutoffHour * 60 + FridayCutoffMin);
   return false;
}

//+------------------------------------------------------------------+
//| ═══════ NEWS FILTER ═══════                                       |
//+------------------------------------------------------------------+
void LoadNews()
{
   if(!UseNewsFilter) return;
   if(g_newsLastLoad > 0 && TimeCurrent() - g_newsLastLoad < 14400) return;

   string url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
   string cookie = "", headers = "";
   char post[], result[];
   ResetLastError();

   int res = WebRequest("GET", url, cookie, NULL, 10000, post, 0, result, headers);
   if(res == -1)
   {
      if(GetLastError() == 4060) Print("NEWS: Add URL in MT4 -> Tools -> Options -> Expert Advisors");
      else Print("NEWS: err:", GetLastError());
      g_newsStatus = "FAIL"; return;
   }

   string json = CharArrayToString(result);
   g_newsCount = 0;
   int pos = 0;

   while(pos < StringLen(json) && g_newsCount < 50)
   {
      int os = StringFind(json, "{", pos);
      if(os < 0) break;
      int oe = StringFind(json, "}", os);
      if(oe < 0) break;
      string obj = StringSubstr(json, os, oe - os + 1);
      pos = oe + 1;

      if(StringFind(obj, "\"USD\"") < 0) continue;
      string impact = "";
      if(StringFind(obj, "\"High\"") >= 0)        impact = "!!";
      else if(StringFind(obj, "\"Medium\"") >= 0)  impact = "! ";
      else continue;

      int ds = StringFind(obj, "\"date\":\"");
      if(ds < 0) continue;
      ds += 8;
      int de = StringFind(obj, "\"", ds);
      datetime eventTime = ParseNewsDate(StringSubstr(obj, ds, de - ds));
      if(eventTime <= 0) continue;

      string title = "";
      int ts2 = StringFind(obj, "\"title\":\"");
      if(ts2 >= 0) { ts2 += 9; int te = StringFind(obj, "\"", ts2); title = StringSubstr(obj, ts2, te - ts2); }

      g_newsTime[g_newsCount]   = eventTime;
      g_newsImpact[g_newsCount] = impact;
      g_newsTitle[g_newsCount]  = title;
      g_newsCount++;
   }
   g_newsLastLoad = TimeCurrent();
   Print("NEWS: ", g_newsCount, " USD (High+Med)");
}

datetime ParseNewsDate(string dateStr)
{
   if(StringLen(dateStr) < 19) return 0;
   int year  = (int)StringToInteger(StringSubstr(dateStr, 0, 4));
   int month = (int)StringToInteger(StringSubstr(dateStr, 5, 2));
   int day   = (int)StringToInteger(StringSubstr(dateStr, 8, 2));
   int hour  = (int)StringToInteger(StringSubstr(dateStr, 11, 2));
   int min   = (int)StringToInteger(StringSubstr(dateStr, 14, 2));

   int serverGMT = (int)(TimeCurrent() - TimeGMT()) / 3600;
   hour += serverGMT - NewsSourceGMT;
   while(hour >= 24) { hour -= 24; day++; }
   while(hour < 0)   { hour += 24; day--; }

   return StringToTime(StringFormat("%04d.%02d.%02d %02d:%02d:00", year, month, day, hour, min));
}

bool CheckNewsBlock()
{
   if(!UseNewsFilter || g_newsCount == 0) { g_newsBlock = false; g_newsStatus = ""; return false; }

   datetime now = TimeCurrent();
   g_newsBlock = false; g_newsStatus = "";

   for(int i = 0; i < g_newsCount; i++)
   {
      if(now >= g_newsTime[i] - NewsMinsBefore * 60 && now <= g_newsTime[i] + NewsMinsAfter * 60)
      {
         g_newsBlock = true;
         string shortName = g_newsTitle[i];
         if(StringLen(shortName) > 16) shortName = StringSubstr(shortName, 0, 16) + "..";
         if(now < g_newsTime[i])
            g_newsStatus = g_newsImpact[i] + IntegerToString((int)(g_newsTime[i]-now)/60) + "m> " + shortName;
         else
            g_newsStatus = g_newsImpact[i] + "<" + IntegerToString((int)(now-g_newsTime[i])/60) + "m " + shortName;
         return true;
      }
   }

   datetime nearest = 0; int nearIdx = -1;
   for(int i = 0; i < g_newsCount; i++)
   {
      if(g_newsTime[i] > now && (nearest == 0 || g_newsTime[i] < nearest))
      { nearest = g_newsTime[i]; nearIdx = i; }
   }
   if(nearIdx >= 0)
   {
      int ml = (int)(nearest - now) / 60;
      if(ml < 60)       g_newsStatus = "Nxt:" + IntegerToString(ml) + "m";
      else if(ml < 1440) g_newsStatus = "Nxt:" + IntegerToString(ml/60) + "h";
      else               g_newsStatus = "Nxt:" + IntegerToString(ml/1440) + "d";
   }
   return false;
}

//+------------------------------------------------------------------+
//| PAIR LOCK — per-account lock file (written by Python sync)      |
//+------------------------------------------------------------------+
bool IsPairLocked()
{
   if(!UsePairLock) return false;
   // Per-account file: clevredge_locked_260069386.txt  (content "1" = locked)
   string fname = "clevredge_locked_" + IntegerToString(AccountNumber()) + ".txt";
   int fh = FileOpen(fname, FILE_READ|FILE_TXT|FILE_COMMON);
   if(fh == INVALID_HANDLE) return false;   // no file = not locked

   string line = FileReadString(fh);
   FileClose(fh);
   StringTrimRight(line); StringTrimLeft(line);
   return (line == "1");
}

//+------------------------------------------------------------------+
//| RECOVER AW                                                        |
//+------------------------------------------------------------------+
void RecoverAWState()
{
   int awOrd = 0, ourOrd = 0, ourBuy = 0, ourSell = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderType() > OP_SELL) continue;
      if(OrderMagicNumber() == AW_MagicNumber) awOrd++;
      if(OrderMagicNumber() == MagicNumber)
      { ourOrd++; if(OrderType()==OP_BUY) ourBuy++; else ourSell++; }
   }
   // Recover MG state: >1 order on same side = MG already fired
   if(ourBuy > 1 || ourSell > 1) g_mgFired = true;

   if(awOrd > 0)
   { g_isWaitAW = true; g_awSimStart = TimeCurrent(); g_rcRound++; }
}

//+------------------------------------------------------------------+
//| MAIN TICK                                                         |
//+------------------------------------------------------------------+
void OnTick()
{
   CalcDayPnL();
   TrackDD();
   if(Day() != g_awDayDate) { g_awDayCount = 0; g_scalpTPDay = 0; g_lcDayCount = 0; g_awDayDate = Day(); }

   if(g_isWaitAW) { HandleWaitAW(); return; }

   ManageTP();
   CheckMartingale();
   CheckAWOrders();
   if(g_isWaitAW) { DrawMini("WAIT AW"); return; }
   if(CheckMaxDD()) { DrawMini("DD LIMIT!"); return; }
   if(CheckLossCut()) { DrawMini("LOSS CUT!"); return; }

   if(UseNewsFilter && !IsTesting()) LoadNews();
   CheckNewsBlock();

   if(!IsNewBar()) { DrawMini(GetStatus()); return; }

   if(!CanTrade()) { g_lastAction = "Spread/Day"; DrawMini("PAUSED"); return; }

   DoTrade();
   string st = GetStatus();
   if(StringFind(g_lastAction, "SKIP") >= 0) st = "SKIP";
   else if(CntOrd(OP_BUY) + CntOrd(OP_SELL) > 0) st = "ACTIVE";
   DrawMini(st);
}

//+------------------------------------------------------------------+
//| STATUS                                                            |
//+------------------------------------------------------------------+
string GetStatus()
{
   if(g_awCooldownEnd > 0 && TimeCurrent() < g_awCooldownEnd) return "COOLDOWN";
   if(g_newsBlock) return "NEWS";
   if(IsMarketOpenWait() && CntOrd(OP_BUY)+CntOrd(OP_SELL) == 0) return "OPEN WAIT";
   if(IsMarketCloseBlock() && CntOrd(OP_BUY)+CntOrd(OP_SELL) == 0) return "CLOSE WAIT";
   if(IsFridayBlock()) return (CntOrd(OP_BUY)+CntOrd(OP_SELL) > 0) ? "FRI CLOSING" : "FRI STOP";
   if(MondayWait && DayOfWeek()==1 && Hour()<MondayWaitHours)
      return (CntOrd(OP_BUY)+CntOrd(OP_SELL) > 0) ? "ACTIVE" : "MON WAIT";
   return (CntOrd(OP_BUY)+CntOrd(OP_SELL) > 0) ? "ACTIVE" : "WAITING";
}

//+------------------------------------------------------------------+
//| TRADE — 1 order per bar, side from AllowBuy/AllowSell          |
//+------------------------------------------------------------------+
void DoTrade()
{
   if(g_isWaitAW) return;
   if(g_newsBlock) { g_lastAction = "NEWS: " + g_newsStatus; return; }

   int total = CntOrd(OP_BUY) + CntOrd(OP_SELL);
   if(total > 0)
   {
      g_lastAction = "Holding (" + IntegerToString(total) + ")";
      return;
   }

   // total == 0 → cooldown: wait N min + new bar
   if(g_awCooldownEnd > 0)
   {
      if(TimeCurrent() < g_awCooldownEnd)
      { int sec = (int)(g_awCooldownEnd - TimeCurrent()); g_lastAction = "COOL " + IntegerToString(sec/60) + ":" + StringFormat("%02d", sec%60); return; }
      // Cooldown time passed → reset and require new bar
      g_awCooldownEnd = 0; g_lastBar = Time[0];
      g_lastAction = "COOL OK, wait bar"; return;
   }
   if(IsPairLocked()) { g_lastAction = "PAIR LOCKED"; return; }
   if(IsMarketOpenWait()) { g_lastAction = "OPEN WAIT " + IntegerToString(MarketOpenWaitMin) + "m"; return; }
   if(IsMarketCloseBlock()) { g_lastAction = "CLOSE WAIT " + IntegerToString(MarketCloseHour) + ":00"; return; }
   if(IsFridayBlock()) { g_lastAction = "FRI STOP"; return; }
   if(MondayWait && DayOfWeek()==1 && Hour()<MondayWaitHours) { g_lastAction = "MON WAIT"; return; }
   if(!IsTradingDay()) { g_lastAction = "DAY OFF"; return; }

   double lot = GetBaseLot();
   string nf = IsNightMode() ? " [N]" : "";
   if(AllowBuy)
   { OpenOrder(OP_BUY, lot); g_lastAction = "NEW BUY" + nf; }
   else if(AllowSell)
   { OpenOrder(OP_SELL, lot); g_lastAction = "NEW SELL" + nf; }
   else g_lastAction = "SKIP (no side)";
}

//+------------------------------------------------------------------+
//| MARTINGALE — add 1 MG order when loss >= threshold               |
//+------------------------------------------------------------------+
void CheckMartingale()
{
   if(!UseMartingale || g_mgFired || g_isWaitAW) return;
   int buys = CntOrd(OP_BUY), sells = CntOrd(OP_SELL);
   if(buys + sells == 0) return;   // no open orders

   double pnl = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);
   if(pnl >= -MG_LossThreshold) return;   // loss not yet reached threshold

   // Determine side: add to the losing side
   double lot = NormLot(MG_Lot);
   if(buys > 0 && sells == 0)
   { OpenOrder(OP_BUY, lot); g_mgFired = true; g_lastAction = "MG BUY " + DoubleToStr(lot,2); }
   else if(sells > 0 && buys == 0)
   { OpenOrder(OP_SELL, lot); g_mgFired = true; g_lastAction = "MG SELL " + DoubleToStr(lot,2); }
}

void OpenOrder(int type, double lot)
{
   lot = NormLot(lot);
   double price = (type == OP_BUY) ? Ask : Bid;
   string cmt = TradeComment + " " + TimeToStr(TimeCurrent() + ServerToThai * 3600, TIME_DATE|TIME_SECONDS);
   int ticket = OrderSend(Symbol(), type, lot, price, Slippage, 0, 0, cmt, MagicNumber, 0,
                           (type == OP_BUY) ? clrLime : clrOrangeRed);
   if(ticket < 0) Print("OPEN FAIL Err:", GetLastError());
}

//+------------------------------------------------------------------+
//| TP                                                                |
//+------------------------------------------------------------------+
void ManageTP()
{
   if(UseTrailing) { ManageTrailingTP(); return; }

   double tp = GetTPTarget(); if(tp <= 0) return;
   // Basket TP: sum PnL of all orders (main + MG) must reach TP to close
   double totalPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);
   int buys = CntOrd(OP_BUY), sells = CntOrd(OP_SELL);
   if(buys + sells > 0 && totalPnL >= tp)
   {
      if(buys > 0) CloseAll(OP_BUY);
      if(sells > 0) CloseAll(OP_SELL);
      g_scalpTPCount++; g_scalpTPDay++;
      g_lastAction = "BASKET TP! $" + DoubleToStr(totalPnL,2);
      SetCooldown();
   }
}

//+------------------------------------------------------------------+
//| TRAILING TP — lock profit at TP level, trail by TrailStep        |
//| + Safety close: if profit drops below lock, close at market      |
//+------------------------------------------------------------------+
void ManageTrailingTP()
{
   double tp = GetTPTarget(); if(tp <= 0) return;
   int buys = CntOrd(OP_BUY), sells = CntOrd(OP_SELL);
   int totalOrders = buys + sells;

   // Reset when no orders
   if(totalOrders == 0)
   {
      if(g_trailActive)
      {
         g_scalpTPCount++; g_scalpTPDay++;
         g_lastAction = "TRAIL TP! $" + DoubleToStr(g_trailLock, 1);
         SetCooldown();
      }
      g_trailActive = false;
      g_trailLock = 0;
      return;
   }

   // Basket PnL: sum all orders (main + MG)
   double basketPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   // --- Check close first: if profit drops below lock -> close immediately ---
   if(g_trailLock > 0 && basketPnL < g_trailLock)
   {
      Print("TRAIL SAFETY CLOSE basket Lock=$", DoubleToStr(g_trailLock,1),
            " PnL=$", DoubleToStr(basketPnL,2));
      if(buys > 0) CloseAll(OP_BUY);
      if(sells > 0) CloseAll(OP_SELL);
      g_scalpTPCount++; g_scalpTPDay++;
      g_lastAction = "SAFE TP $" + DoubleToStr(basketPnL,1);
      SetCooldown();
      g_trailActive = false; g_trailLock = 0;
      return;
   }

   // --- Basket profit >= TP: update lock ---
   if(basketPnL >= tp)
   {
      g_trailActive = true;
      int steps = (int)MathFloor((basketPnL - tp) / TrailStep);
      double newLock;
      if(TrailBreakeven)
         newLock = (steps == 0) ? 0 : tp + (steps - 1) * TrailStep;
      else
         newLock = tp + steps * TrailStep;
      if(newLock > g_trailLock) g_trailLock = newLock;
      g_lastAction = "TRAIL Lock:$" + DoubleToStr(g_trailLock,1) + " Now:$" + DoubleToStr(basketPnL,1);
   }
}

double GetTPTarget()
{
   if(TP_Mode == TP_DOLLAR) return TP_Dollar;
   if(TP_Pips <= 0) return 0;
   double totalLots = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;
     if(OrderType() > OP_SELL) continue; totalLots += OrderLots(); }
   if(totalLots <= 0) return 0;
   double tv = MarketInfo(Symbol(), MODE_TICKVALUE);
   double ts = MarketInfo(Symbol(), MODE_TICKSIZE);
   if(ts <= 0) return TP_Dollar;
   double target = TP_Pips * (tv / ts * Point) * totalLots;
   return (target < 0.10) ? 0.10 : target;
}

//+------------------------------------------------------------------+
//| BASKET SL / AW                                                    |
//+------------------------------------------------------------------+
// Check if AW Recovery EA has opened orders -> stop trading and wait
void CheckAWOrders()
{
   if(g_isWaitAW) return;
   if(CntAW() > 0)
   {
      g_awDayCount++;
      g_isWaitAW = true; g_rcRound++; g_rcCurrentDD = 0;
      g_awSimStart = TimeCurrent(); g_mgFired = false;
      g_lastAction = "AW DETECTED -> Wait";
      Print(">>> AW DETECTED, switching to wait mode");
   }
}

void HandleWaitAW()
{
   double awNet = AllPnL();
   double awDD = -awNet; if(awDD > g_rcCurrentDD) g_rcCurrentDD = awDD;

   if(IsTesting())
   {
      if((int)(TimeCurrent() - g_awSimStart) >= 1200)
      { CloseAllMine(); g_isWaitAW = false; g_lastAction = "AW SIM OK #" + IntegerToString(g_rcRound); DrawMini("ACTIVE"); return; }
      int sec = 1200 - (int)(TimeCurrent() - g_awSimStart);
      g_lastAction = "AW SIM " + IntegerToString(sec/60) + ":" + StringFormat("%02d", sec%60);
      DrawMini("AW SIM"); return;
   }

   int ours = CntOrd(OP_BUY) + CntOrd(OP_SELL);
   int aws  = CntAW();
   // Emergency Hedge
   if(!g_emergHedged && EmergencyDD > 0)
   {
      double ourPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);
      if(MathAbs(ourPnL) >= EmergencyDD && aws == 0)
      {
         double bp = CalcPnL(OP_BUY), sp = CalcPnL(OP_SELL);
         int loseSide = (bp < sp) ? OP_BUY : OP_SELL;
         int hedgeDir = (loseSide == OP_BUY) ? OP_SELL : OP_BUY;
         double hLot  = TotalLots(loseSide);
         if(hLot > 0)
         {
            double price = (hedgeDir == OP_BUY) ? Ask : Bid;
            int t = OrderSend(Symbol(), hedgeDir, hLot, price, Slippage, 0, 0, "CE EMERG", MagicNumber, 0, clrRed);
            if(t > 0) { g_emergHedged = true; Print(">>> EMERGENCY HEDGE!"); }
         }
      }
   }

   if(aws == 0 && ours == 0)
   { g_isWaitAW = false; g_emergHedged = false; SetCooldown(); g_lastAction = "AW DONE! Cool:" + IntegerToString(CooldownMin) + "m"; DrawMini("COOLDOWN"); return; }

   if(aws == 0 && ours > 0)
   {
      double rem = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);
      double awTP = GetTPTarget();
      if(awTP <= 0) awTP = TP_Dollar;
      if(rem >= awTP) { CloseAllMine(); g_isWaitAW = false; g_emergHedged = false; SetCooldown(); g_lastAction = "AW+TP $" + DoubleToStr(rem,1) + " Cool:" + IntegerToString(CooldownMin) + "m"; DrawMini("COOLDOWN"); return; }
      if(rem >= 0)
      { g_isWaitAW = false; g_emergHedged = false; SetCooldown(); g_lastAction = "AW OK Cool:" + IntegerToString(CooldownMin) + "m"; DrawMini("COOLDOWN"); return; }
      g_lastAction = "FROZEN $" + DoubleToStr(rem,1); DrawMini("WAIT AW"); return;
   }

   g_lastAction = "AW:" + IntegerToString(aws) + " $" + DoubleToStr(awNet,1) + (g_emergHedged?" [H]":"");
   DrawMini(g_emergHedged ? "EMERGENCY" : "WAIT AW");
}

//+------------------------------------------------------------------+
//| UTILITY                                                           |
//+------------------------------------------------------------------+
bool IsNewBar() { if(g_lastBar != Time[0]) { g_lastBar = Time[0]; return true; } return false; }

void SetCooldown()
{
   g_mgFired = false;   // reset MG flag for next cycle
   if(CooldownMin > 0) { g_awCooldownEnd = TimeCurrent() + CooldownMin * 60; g_lastBar = Time[0]; }
}

bool CanTrade()
{
   if((int)MarketInfo(Symbol(), MODE_SPREAD) > g_maxSpreadPts) return false;
   return IsTradingDay();
}

bool IsTradingDay()
{
   int d = DayOfWeek();
   if(d == 1 && !TradeMonday) return false;
   if(d == 2 && !TradeTuesday) return false;
   if(d == 3 && !TradeWednesday) return false;
   if(d == 4 && !TradeThursday) return false;
   if(d == 0 || d == 6) return false;
   return true;
}

bool CheckMaxDD()
{
   if(MaxDD_Percent <= 0) return false;
   double b = AccountBalance(); if(b <= 0) return false;
   return (((b - AccountEquity()) / b) * 100.0 >= MaxDD_Percent);
}

bool CheckLossCut()
{
   if(LossCutValue <= 0) return false;
   if(AccountBalance() - AccountEquity() >= LossCutValue) { CloseAllMine(); g_lcCount++; g_lcDayCount++; g_lastAction = "LOSS CUT! #" + IntegerToString(g_lcCount); return true; }
   return false;
}

int CntOrd(int type)
{
   int c = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber || OrderType() != type) continue; c++; }
   return c;
}

int CntAW()
{
   int c = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != AW_MagicNumber || OrderType() > OP_SELL) continue; c++; }
   return c;
}

double CalcPnL(int type)
{
   double p = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber || OrderType() != type) continue;
     p += OrderProfit() + OrderSwap() + OrderCommission(); }
   return p;
}

// PnL of AW Recovery orders only
double CalcAWPnL()
{
   double p = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != AW_MagicNumber) continue;
     if(OrderType() > OP_SELL) continue;
     p += OrderProfit() + OrderSwap() + OrderCommission(); }
   return p;
}

// Combined PnL: EA + AW
double AllPnL()
{
   double p = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol()) continue;
     int mg = OrderMagicNumber();
     if(mg != MagicNumber && mg != AW_MagicNumber) continue;
     p += OrderProfit() + OrderSwap() + OrderCommission(); }
   return p;
}

double TotalLots(int type)
{
   double l = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber || OrderType() != type) continue;
     l += OrderLots(); }
   return l;
}

void CloseAll(int type)
{
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber || OrderType() != type) continue;
     OrderClose(OrderTicket(), OrderLots(), (type == OP_BUY) ? Bid : Ask, Slippage, clrYellow); }
}

void CloseAllMine()
{
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber || OrderType() > OP_SELL) continue;
     OrderClose(OrderTicket(), OrderLots(), (OrderType() == OP_BUY) ? Bid : Ask, Slippage, clrRed); }
}

double NormLot(double lot)
{
   double mn = MarketInfo(Symbol(), MODE_MINLOT);
   double mx = MarketInfo(Symbol(), MODE_MAXLOT);
   double st = MarketInfo(Symbol(), MODE_LOTSTEP);
   lot = MathMax(mn, MathMin(mx, MathMin(MaxLotLimit, lot)));
   return NormalizeDouble(MathCeil(lot / st) * st, 2);
}

//+------------------------------------------------------------------+
//| P&L                                                               |
//+------------------------------------------------------------------+
bool MatchScope(int mg, string sym)
{
   if(PnL_Scope == PNL_THIS_EA) return (sym == Symbol() && mg == MagicNumber);
   if(PnL_Scope == PNL_SYMBOL) return (sym == Symbol());
   return true;
}

void CalcDayPnL()
{
   g_dayPnL = 0;
   datetime today = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE));
   for(int j = OrdersHistoryTotal()-1; j >= 0; j--)
   { if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
     if(OrderType() > OP_SELL || !MatchScope(OrderMagicNumber(), OrderSymbol())) continue;
     if(OrderCloseTime() >= today) g_dayPnL += OrderProfit() + OrderSwap() + OrderCommission(); }
   for(int i = OrdersTotal()-1; i >= 0; i--)
   { if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
     if(OrderType() > OP_SELL || !MatchScope(OrderMagicNumber(), OrderSymbol())) continue;
     g_dayPnL += OrderProfit() + OrderSwap() + OrderCommission(); }
}

void TrackDD()
{
   double b = AccountBalance(); if(b <= 0) return;
   g_ddCurrent = MathMax(0, (b - AccountEquity()) / b * 100.0);
   if(g_ddCurrent > g_ddPeak) g_ddPeak = g_ddCurrent;
}

//+------------------------------------------------------------------+
//| MINI DASHBOARD                                                     |
//| L1: Label | Status                                                |
//| L2: PnL (EA + AW combined)                                       |
//| L3: Mode (Buy/Sell) | Lot                                        |
//| L4: Day P&L | TP count                                           |
//| L5: Last Action                                                   |
//| L6: News status                                                   |
//+------------------------------------------------------------------+
void DrawMini(string status)
{
   if(!ShowDashboard) return;
   static uint lastMs = 0;
   uint now = GetTickCount();
   if(now - lastMs < (IsTesting() ? 2000 : 500)) return;
   lastMs = now;

   int px = 15, py = 18, pw = 260, LH = 16;
   int cx = px + 8, vx = px + pw - 8;

   int lines = 5;
   if(g_newsStatus != "") lines++;
   MiniBox("CE_bg", px, py, pw, LH * lines + 16);
   int y = py + 6;

   // L1: Label | Status
   string nightF = IsNightMode() ? " [N]" : "";
   color stClr = clrOrangeRed;
   if(status == "ACTIVE") stClr = clrLime;
   else if(status == "WAITING" || status == "SKIP") stClr = C'255,220,80';
   else if(status == "COOLDOWN") stClr = C'255,180,50';
   else if(status == "MON WAIT") stClr = C'100,180,255';
   else if(StringFind(status,"FRI") >= 0) stClr = clrOrange;
   else if(StringFind(status,"AW") >= 0) stClr = clrOrange;
   else if(status == "NEWS") stClr = C'255,80,80';
   MiniLab("l1", cx, y, AccountLabel + " | " + status + nightF, stClr, 9); y += LH;

   // L2: PnL — show EA + AW combined
   double eaPnL  = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);
   double awPnL  = CalcAWPnL();
   int    awOrd  = CntAW();
   int    eaOrd  = CntOrd(OP_BUY) + CntOrd(OP_SELL);
   double netAll = eaPnL + awPnL;

   if(awOrd > 0)
   {
      // Has AW orders → show EA + AW = total
      color netClr = (netAll >= 0) ? C'100,230,100' : C'255,80,80';
      string eaSign = (eaPnL >= 0) ? "+" : "";
      string awSign = (awPnL >= 0) ? "+" : "";
      MiniLab("l2", cx, y, "EA:" + eaSign + DoubleToStr(eaPnL,1) +
              " AW:" + awSign + DoubleToStr(awPnL,1) +
              " =" + (netAll>=0?"+":"") + DoubleToStr(netAll,1), netClr, 8);
   }
   else
   {
      // No AW → show normal
      color pClr = (eaPnL >= 0) ? C'100,230,100' : C'255,80,80';
      string ddBar = "";
      if(UseMartingale && MG_LossThreshold > 0 && eaPnL < 0)
      { double r = MathAbs(eaPnL)/MG_LossThreshold; ddBar = (r>=1.0)?" MG!":(r>=0.5)?" !":""; }
      MiniLab("l2", cx, y, (eaPnL>=0?"+":"") + DoubleToStr(eaPnL,2) + "$ | " +
              IntegerToString(eaOrd) + "ord" + ddBar, pClr, 9);
   }
   y += LH;

   // L3: Mode + Lot + Trail
   string modeTxt = "";
   if(AllowBuy && AllowSell) modeTxt = "BUY+SELL";
   else if(AllowBuy)  modeTxt = "BUY ONLY";
   else if(AllowSell) modeTxt = "SELL ONLY";
   else               modeTxt = "NO SIDE";
   color modeClr = AllowBuy ? C'50,200,255' : C'255,120,80';
   string lotTxt = " Lot:" + DoubleToStr(GetBaseLot(),2);
   string trailTxt = UseTrailing ? (g_trailActive ? " T:$"+DoubleToStr(g_trailLock,1) : " T:ON") : "";
   color l3Clr = g_trailActive ? C'100,255,100' : modeClr;
   MiniLab("l3", cx, y, modeTxt + lotTxt + trailTxt, l3Clr, 8); y += LH;

   // L4: Day P&L | TP | SL | LC
   color dClr = (g_dayPnL >= 0) ? C'100,230,100' : C'255,80,80';
   string l4Txt = "Day:" + (g_dayPnL>=0?"+":"") + DoubleToStr(g_dayPnL,2) +
           " TP:" + IntegerToString(g_scalpTPDay) + "/" + IntegerToString(g_scalpTPCount) +
           " AW:" + IntegerToString(g_awDayCount);
   if(g_lcCount > 0) l4Txt += " LC:" + IntegerToString(g_lcDayCount) + "/" + IntegerToString(g_lcCount);
   MiniLab("l4", cx, y, l4Txt, dClr, 8); y += LH;

   // L5: Action
   string act = g_lastAction; if(StringLen(act) > 30) act = StringSubstr(act,0,30) + "..";
   MiniLab("l5", cx, y, act, C'100,100,120', 7); y += LH;

   // L6: News
   if(g_newsBlock)             MiniLab("l6", cx, y, "!! " + g_newsStatus, C'255,80,80', 7);
   else if(g_newsStatus != "") MiniLab("l6", cx, y, g_newsStatus, C'120,120,140', 7);
   else                        MiniLab("l6", 0, 0, "", clrNONE, 1);
   if(g_newsStatus != "") y += LH;

   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//| Mini helpers                                                      |
//+------------------------------------------------------------------+
void MiniBox(string name, int x, int y, int w, int h)
{
   if(ObjectFind(0, name) < 0)
   { ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
     ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
     ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
     ObjectSetInteger(0, name, OBJPROP_BACK, false);
     ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
     ObjectSetInteger(0, name, OBJPROP_HIDDEN, true); }
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, C'20,20,30');
   ObjectSetInteger(0, name, OBJPROP_COLOR, C'20,20,30');
}

void MiniLab(string id, int x, int y, string text, color clr, int sz)
{
   string name = "CE_" + id;
   if(ObjectFind(0, name) < 0)
   { ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
     ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
     ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
     ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
     ObjectSetInteger(0, name, OBJPROP_HIDDEN, true); }
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void MiniLabR(string id, int x, int y, string text, color clr, int sz)
{
   string name = "CE_" + id;
   if(ObjectFind(0, name) < 0)
   { ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
     ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
     ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);
     ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
     ObjectSetInteger(0, name, OBJPROP_HIDDEN, true); }
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}
//+------------------------------------------------------------------+
