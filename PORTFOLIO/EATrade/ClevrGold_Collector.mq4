//+------------------------------------------------------------------+
//| ClevrGold_Collector.mq4                                           |
//| INDICATOR version v2.2 — BackfillAll support                      |
//| Runs on SAME chart as ClevrGold EA!                              |
//| Collects account data -> CSV -> Python -> Neon DB                |
//| v2.1: Added WritePositions() for open positions tracking         |
//+------------------------------------------------------------------+
#property copyright "ClevrGold"
#property version   "2.2"
#property strict
#property indicator_chart_window
#property indicator_buffers 0

//+------------------------------------------------------------------+
//| SETTINGS                                                          |
//+------------------------------------------------------------------+
extern string  _SET_           = "======= COLLECTOR SETTINGS =======";
extern int     ClevrMagic      = 9244;
extern int     AWMagic         = 9751421;
extern double  InitialDeposit  = 0;
extern bool    ShowPanel       = true;
extern bool    BackfillAll     = true;  // Set TRUE to export ALL trade history on startup

//+------------------------------------------------------------------+
//| GLOBALS                                                           |
//+------------------------------------------------------------------+
datetime g_lastSnap     = 0;
datetime g_lastBal      = 0;
int      g_snapCount    = 0;
int      g_tradesSynced = 0;
int      g_lastTicket   = 0;
string   g_status       = "Starting...";
double   g_initBal      = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   g_initBal = (InitialDeposit > 0) ? InitialDeposit : AccountBalance();

   Print("=== ClevrGold Collector v2.2 (Indicator) ===");
   Print("Account: ", AccountNumber(), " | ", AccountName());
   Print("Files:   ", TerminalInfoString(TERMINAL_DATA_PATH), "\\MQL4\\Files\\");
   Print("BackfillAll: ", BackfillAll ? "TRUE" : "FALSE");

   if(BackfillAll)
   {
      // Backfill mode: set g_lastTicket=0 so ALL history trades are exported
      g_lastTicket = 0;
      Print("BACKFILL: Will export ALL trade history (", OrdersHistoryTotal(), " items in history)");
   }
   else
   {
      // Normal mode: find highest existing ticket at startup (skip old trades)
      for(int j = OrdersHistoryTotal()-1; j >= 0; j--)
      {
         if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
         if(OrderSymbol() != Symbol()) continue;
         if(OrderType() > OP_SELL) continue;
         if(OrderTicket() > g_lastTicket)
            g_lastTicket = OrderTicket();
      }
   }

   WriteAccountInfo();
   WriteSnapshot();
   WritePositions();

   // If backfill, immediately write trades (don't wait 10 min)
   if(BackfillAll)
   {
      WriteNewTrades();
      Print("BACKFILL: Trade export complete, synced ", g_tradesSynced, " trades");
   }

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0, "GC_");
}

//+------------------------------------------------------------------+
//| OnCalculate - runs every tick (like OnTick for indicators)       |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   datetime now = TimeCurrent();

   // Snapshot + Positions + Trades every 10 sec
   if(now - g_lastSnap >= 10)
   {
      WriteSnapshot();
      WritePositions();
      WriteNewTrades();
      g_lastSnap = now;
      g_snapCount++;
   }

   // Balance curve every 5 min
   if(now - g_lastBal >= 300)
   {
      WriteBalancePoint();
      g_lastBal = now;
   }

   if(ShowPanel) DrawPanel();

   return(rates_total);
}

//+------------------------------------------------------------------+
void WriteAccountInfo()
{
   string fname = "collector_account_" + IntegerToString(AccountNumber()) + ".csv";
   int h = FileOpen(fname, FILE_WRITE|FILE_CSV, '|');
   if(h < 0) { Print("ERROR write: ", fname, " err:", GetLastError()); return; }
   FileWrite(h,
      IntegerToString(AccountNumber()),
      AccountName(),
      AccountServer(),
      AccountCompany(),
      DoubleToStr(g_initBal, 2),
      IntegerToString(AccountLeverage()),
      AccountCurrency(),
      TimeToStr(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );
   FileClose(h);
   Print("Account info written: ", fname);
}

//+------------------------------------------------------------------+
void WriteSnapshot()
{
   string fname = "collector_snap_" + IntegerToString(AccountNumber()) + ".csv";
   int h = FileOpen(fname, FILE_WRITE|FILE_CSV, '|');
   if(h < 0) return;

   int clevr = 0, aw = 0;
   double clevPnL = 0, awPnL = 0;
   for(int i = OrdersTotal()-1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;
      double pnl = OrderProfit() + OrderSwap() + OrderCommission();
      if(OrderMagicNumber() == ClevrMagic)  { clevr++; clevPnL += pnl; }
      else if(OrderMagicNumber() == AWMagic) { aw++;    awPnL += pnl; }
   }

   string mode = (aw > 0) ? "AW" : "OK";
   double floating = clevPnL + awPnL;
   double mgLvl = (AccountMargin() > 0) ? AccountEquity()/AccountMargin()*100 : 0;

   // Calc realized PnL
   double dayPnL = CalcClosedPnL(0) + floating;
   double weekPnL = CalcClosedPnL(1) + floating;

   FileWrite(h,
      IntegerToString(AccountNumber()),        // 0
      DoubleToStr(AccountBalance(), 2),         // 1
      DoubleToStr(AccountEquity(), 2),          // 2
      DoubleToStr(floating, 2),                 // 3
      DoubleToStr(AccountMargin(), 2),          // 4
      DoubleToStr(AccountFreeMargin(), 2),      // 5
      DoubleToStr(mgLvl, 2),                    // 6
      DoubleToStr(dayPnL, 2),                   // 7
      DoubleToStr(weekPnL, 2),                  // 8
      IntegerToString(clevr),                   // 9
      IntegerToString(aw),                      // 10
      mode,                                     // 11
      "0",                                      // 12
      DoubleToStr(clevPnL, 2),                  // 13
      DoubleToStr(awPnL, 2),                    // 14
      IntegerToString((int)MarketInfo(Symbol(), MODE_SPREAD)), // 15
      TimeToStr(TimeCurrent(), TIME_DATE|TIME_SECONDS)         // 16
   );
   FileClose(h);
   g_status = "OK " + TimeToStr(TimeCurrent(), TIME_SECONDS);
}

//+------------------------------------------------------------------+
//| Write open positions CSV (NEW in v2.1)                           |
//+------------------------------------------------------------------+
void WritePositions()
{
   string fname = "collector_positions_" + IntegerToString(AccountNumber()) + ".csv";
   int h = FileOpen(fname, FILE_WRITE|FILE_CSV, '|');
   if(h < 0) return;

   for(int i = OrdersTotal()-1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;

      double currentPrice = 0;
      if(OrderType() == OP_BUY)
         currentPrice = MarketInfo(OrderSymbol(), MODE_BID);
      else
         currentPrice = MarketInfo(OrderSymbol(), MODE_ASK);

      // Format: ticket|type|lots|symbol|open_price|current_price|sl|tp|commission|swap|profit|open_time
      FileWrite(h,
         IntegerToString(OrderTicket()),                          // 0
         (OrderType() == OP_BUY) ? "BUY" : "SELL",               // 1
         DoubleToStr(OrderLots(), 2),                             // 2
         OrderSymbol(),                                           // 3
         DoubleToStr(OrderOpenPrice(), 2),                        // 4
         DoubleToStr(currentPrice, 2),                            // 5
         DoubleToStr(OrderStopLoss(), 2),                         // 6
         DoubleToStr(OrderTakeProfit(), 2),                       // 7
         DoubleToStr(OrderCommission(), 2),                       // 8
         DoubleToStr(OrderSwap(), 2),                             // 9
         DoubleToStr(OrderProfit(), 2),                           // 10
         TimeToStr(OrderOpenTime(), TIME_DATE|TIME_SECONDS)       // 11
      );
   }

   FileClose(h);
}

//+------------------------------------------------------------------+
void WriteNewTrades()
{
   // Collect recent trades (last 50) into arrays first
   int    t_tickets[];
   int    t_types[];
   double t_lots[], t_openPx[], t_closePx[], t_profit[], t_swap[], t_comm[];
   datetime t_openTime[], t_closeTime[];
   int    t_magic[];
   string t_comment[];
   int count = 0;

   for(int j = OrdersHistoryTotal()-1; j >= 0 && count < 50; j--)
   {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;

      int sz = count + 1;
      ArrayResize(t_tickets, sz);   ArrayResize(t_types, sz);
      ArrayResize(t_lots, sz);      ArrayResize(t_openPx, sz);
      ArrayResize(t_closePx, sz);   ArrayResize(t_profit, sz);
      ArrayResize(t_swap, sz);      ArrayResize(t_comm, sz);
      ArrayResize(t_openTime, sz);  ArrayResize(t_closeTime, sz);
      ArrayResize(t_magic, sz);     ArrayResize(t_comment, sz);

      t_tickets[count]   = OrderTicket();
      t_types[count]     = OrderType();
      t_lots[count]      = OrderLots();
      t_openPx[count]    = OrderOpenPrice();
      t_closePx[count]   = OrderClosePrice();
      t_profit[count]    = OrderProfit();
      t_swap[count]      = OrderSwap();
      t_comm[count]      = OrderCommission();
      t_openTime[count]  = OrderOpenTime();
      t_closeTime[count] = OrderCloseTime();
      t_magic[count]     = OrderMagicNumber();
      t_comment[count]   = OrderComment();
      count++;
   }

   if(count == 0) return;

   // Overwrite file with last 50 trades (not append!)
   string fname = "collector_trades_" + IntegerToString(AccountNumber()) + ".csv";
   int h = FileOpen(fname, FILE_WRITE|FILE_CSV, '|');
   if(h < 0) return;

   int newCount = 0;
   for(int i = count-1; i >= 0; i--)
   {
      FileWrite(h,
         IntegerToString(t_tickets[i]),
         IntegerToString(AccountNumber()),
         (t_types[i] == OP_BUY) ? "BUY" : "SELL",
         DoubleToStr(t_lots[i], 2),
         DoubleToStr(t_openPx[i], Digits),
         DoubleToStr(t_closePx[i], Digits),
         DoubleToStr(t_profit[i], 2),
         DoubleToStr(t_swap[i], 2),
         DoubleToStr(t_comm[i], 2),
         TimeToStr(t_openTime[i], TIME_DATE|TIME_SECONDS),
         TimeToStr(t_closeTime[i], TIME_DATE|TIME_SECONDS),
         IntegerToString(t_magic[i]),
         t_comment[i]
      );

      if(t_tickets[i] > g_lastTicket)
         g_lastTicket = t_tickets[i];
      newCount++;
   }

   FileClose(h);
   g_tradesSynced = count;
   if(newCount > 0 && count != g_snapCount)  // Only log when changed
      Print("Collector: trades file updated (", count, " rows)");
}

//+------------------------------------------------------------------+
void WriteBalancePoint()
{
   string fname = "collector_balance_" + IntegerToString(AccountNumber()) + ".csv";
   int h = FileOpen(fname, FILE_READ|FILE_WRITE|FILE_CSV, '|');
   if(h < 0) return;
   FileSeek(h, 0, SEEK_END);
   FileWrite(h,
      IntegerToString(AccountNumber()),
      DoubleToStr(AccountBalance(), 2),
      DoubleToStr(AccountEquity(), 2),
      TimeToStr(TimeCurrent(), TIME_DATE|TIME_SECONDS)
   );
   FileClose(h);
}

//+------------------------------------------------------------------+
//| Calculate closed PnL: 0=today, 1=this week                      |
//+------------------------------------------------------------------+
double CalcClosedPnL(int period)
{
   datetime startTime;
   if(period == 0)
   {
      startTime = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE));
   }
   else
   {
      datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE));
      int dow = DayOfWeek();
      int daysBack = (dow == 0) ? 6 : dow - 1;
      startTime = todayStart - daysBack * 86400;
   }

   double pnl = 0;
   for(int j = OrdersHistoryTotal()-1; j >= 0; j--)
   {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderSymbol() != Symbol()) continue;
      if(OrderType() > OP_SELL) continue;
      if(OrderCloseTime() >= startTime)
         pnl += OrderProfit() + OrderSwap() + OrderCommission();
   }
   return pnl;
}

//+------------------------------------------------------------------+
//| PANEL DISPLAY                                                     |
//+------------------------------------------------------------------+
void DrawPanel()
{
   int px = 10, py = 20;

   CreateBG("GC_bg", px, py, 220, 80, C'15,15,25', 1);
   CreateBG("GC_bd", px, py, 220, 2, C'80,160,230', 1);

   int cx = px + 8;
   int y = py + 6;
   Lab("t",  cx, y, "Collector v2.2 [IND]", C'80,160,230', 9, 1); y += 18;
   Lab("a",  cx, y, "Acc:" + IntegerToString(AccountNumber()), C'180,180,200', 8, 1); y += 15;
   Lab("s",  cx, y, "Snap:" + IntegerToString(g_snapCount) +
       " Trd:" + IntegerToString(g_tradesSynced), C'130,130,150', 8, 1); y += 15;
   Lab("st", cx, y, g_status, C'100,230,100', 8, 1);
}

void Lab(string id, int x, int y, string text, color clr, int sz, int corner=1)
{
   string name = "GC_" + id;
   if(ObjectFind(name) < 0)
   {
      ObjectCreate(name, OBJ_LABEL, 0, 0, 0);
      ObjectSet(name, OBJPROP_CORNER, corner);
      ObjectSet(name, OBJPROP_SELECTABLE, false);
   }
   ObjectSet(name, OBJPROP_XDISTANCE, x);
   ObjectSet(name, OBJPROP_YDISTANCE, y);
   ObjectSetText(name, text, sz, "Consolas", clr);
}

void CreateBG(string name, int x, int y, int w, int h, color clr, int corner=1)
{
   if(ObjectFind(name) < 0)
   {
      ObjectCreate(name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSet(name, OBJPROP_CORNER, corner);
      ObjectSet(name, OBJPROP_SELECTABLE, false);
      ObjectSet(name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   }
   ObjectSet(name, OBJPROP_XDISTANCE, x);
   ObjectSet(name, OBJPROP_YDISTANCE, y);
   ObjectSet(name, OBJPROP_XSIZE, w);
   ObjectSet(name, OBJPROP_YSIZE, h);
   ObjectSet(name, OBJPROP_BGCOLOR, clr);
   ObjectSet(name, OBJPROP_COLOR, clr);
   ObjectSet(name, OBJPROP_BACK, false);
}
//+------------------------------------------------------------------+
