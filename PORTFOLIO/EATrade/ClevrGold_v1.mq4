//+------------------------------------------------------------------+

//|                                              ClevrGold_v1.mq4    |

//|                     ClevrFX Logic + GoldAI Safety                 |

//|                     RSI+MA Scalp | MG Grid | AW Recovery          |

//+------------------------------------------------------------------+

#property copyright "ClevrGold v1.0"

#property link      ""

#property version   "1.00"

#property strict



//+------------------------------------------------------------------+

//| ENUMS                                                             |

//+------------------------------------------------------------------+

enum ENUM_STRATEGY

{

   STRAT_MEDIUM = 0,   // ความเสี่ยงกลาง (เทรดทุกแท่ง)

   STRAT_LOW    = 1    // ความเสี่ยงต่ำ (สัญญาณแข็งเท่านั้น)

};



enum ENUM_TRADE_DIR

{

   DIR_NORMAL   = 0,   // ปกติ (ตามสัญญาณ)

   DIR_REVERSE  = 1    // กลับด้าน (สวนสัญญาณ)

};



enum ENUM_EA_MODE

{

   MODE_NORMAL   = 0,  // เทรดปกติ

   MODE_WAIT_AW  = 1   // รอ AW Recovery กู้คืน

};



enum ENUM_TP_MODE

{

   TP_DOLLAR = 0,      // TP เป็นเงิน ($)

   TP_PIPS   = 1       // TP เป็น Pips

};



enum ENUM_PNL_SCOPE

{

   PNL_THIS_EA  = 0,   // เฉพาะ EA นี้ (MagicNumber)

   PNL_SYMBOL   = 1,   // ทุกออเดอร์ในสัญลักษณ์นี้

   PNL_ACCOUNT  = 2    // ทั้งบัญชี (ทุกสัญลักษณ์)

};



enum ENUM_FRIDAY_MODE

{

   FRI_NORMAL = 0,      // ปกติ (เทรดตามปกติ)

   FRI_NO_NEW = 1,      // ไม่เปิดออเดอร์ใหม่ทั้งวันศุกร์

   FRI_CUTOFF = 2       // หยุดเปิดใหม่หลังเวลาที่กำหนด

};



enum ENUM_DASH_MODE

{

   DASH_FULL  = 0,      // แดชบอร์ดเต็ม

   DASH_MINI  = 1,      // แดชบอร์ดย่อ (สรุปสั้น)

   DASH_OFF   = 2       // ปิดแดชบอร์ด

};



//+------------------------------------------------------------------+

//| ══════ GENERAL SETTINGS ══════                                    |

//+------------------------------------------------------------------+

extern string         _G_              = "======= ตั้งค่าทั่วไป =======";

extern int            MagicNumber      = 9244;

extern ENUM_STRATEGY  StrategyType     = STRAT_MEDIUM;

extern ENUM_TRADE_DIR TradeDirection   = DIR_NORMAL;

extern bool           AllowBuy         = true;

extern bool           AllowSell        = true;



//+------------------------------------------------------------------+

//| ══════ ORDER SETTINGS ══════                                      |

//+------------------------------------------------------------------+

extern string         _ORD_            = "======= ตั้งค่าออเดอร์ =======";

extern double         StartLot         = 0.02;          // ล็อตเริ่มต้น

extern ENUM_TP_MODE   TP_Mode          = TP_DOLLAR;    // โหมด TP: เงิน หรือ Pips

extern double         TP_Dollar        = 2.0;          // เป้า TP เป็น $ (โหมดเงิน)

extern double         TP_Pips          = 10.0;         // เป้า TP เป็น pips (โหมด Pips)

extern double         LotMultiplier    = 1.25;         // ตัวคูณล็อต MG

extern double         MaxLotLimit      = 1.0;          // ล็อตสูงสุดต่อออเดอร์

extern int            MaxTradesPerSide = 20;           // จำนวน MG สูงสุดต่อฝั่ง



//+------------------------------------------------------------------+

//| ══════ MARTINGALE GRID ══════                                     |

//+------------------------------------------------------------------+

extern string         _NIGHT_          = "======= โหมดกลางคืน =======";

extern bool           UseNightMode     = true;          // ลดล็อตตอนกลางคืน (เวลาไทย)

extern int            NightStartHour   = 19;            // ชม.ไทยเริ่มโหมดกลางคืน

extern int            NightEndHour     = 7;             // ชม.ไทยสิ้นสุดโหมดกลางคืน

extern double         NightLot         = 0.01;          // ล็อตช่วงกลางคืน



extern string         _MG_             = "======= มาร์ติงเกล กริด =======";

extern bool           UseMartingale    = true;           // เปิด/ปิด มาร์ติงเกล

extern double         MG_Distance_Pip  = 150.0;        // ระยะห่าง MG (pips)

extern double         MG_DistMulti     = 1.25;         // ตัวคูณระยะห่างชั้นที่ 3+

extern bool           MG_GapProtect    = false;        // บล็อก MG ถ้า gap > 3 เท่าระยะ

extern bool           OneTradPerCandle = true;         // จำกัด 1 ออเดอร์ต่อแท่ง



//+------------------------------------------------------------------+

//| ══════ RSI SETTINGS ══════                                        |

//+------------------------------------------------------------------+

extern string         _RSI_            = "======= ตั้งค่า RSI =======";

extern int            RSI_Period       = 9;             // คาบ RSI

extern ENUM_APPLIED_PRICE RSI_Price    = PRICE_CLOSE;  // ราคาที่ใช้คำนวณ

extern double         RSI_OB           = 70.0;        // ระดับ Overbought (ซื้อมากเกิน)

extern double         RSI_OS           = 30.0;        // ระดับ Oversold (ขายมากเกิน)



//+------------------------------------------------------------------+

//| ══════ MA SETTINGS ══════                                         |

//+------------------------------------------------------------------+

extern string         _MA_             = "======= ตั้งค่า MA =======";

extern int            MA_Period        = 5;             // คาบ MA

extern int            MA_Shift         = 0;             // เลื่อน MA (แท่ง)

extern ENUM_MA_METHOD MA_Method        = MODE_SMA;     // วิธีคำนวณ MA

extern ENUM_APPLIED_PRICE MA_Price     = PRICE_CLOSE;  // ราคาที่ใช้คำนวณ



//+------------------------------------------------------------------+

//| ══════ DD TRIGGER ══════                                          |

//+------------------------------------------------------------------+

extern string         _DD_             = "##### จัดการ Drawdown #####";

extern double         BasketSL_Dollar  = 20.0;        // ขาดทุน ($) แล้วหยุด รอ AW กู้คืน

extern double         MaxDD_Percent    = 100.0;        // DD% สูงสุดก่อนหยุดเทรด

extern int            AW_MagicNumber   = 9751421;      // Magic Number ของ AW Recovery

extern double         EmergencyDD      = 50.0;         // Hedge ฉุกเฉินถ้า AW ไม่มา ($)



//+------------------------------------------------------------------+

//| ══════ LOSS CUT ══════                                            |

//+------------------------------------------------------------------+

extern string         _LC_             = "======= ตัดขาดทุน =======";

extern double         LossCutValue     = 1000.0;       // ขาดทุนสูงสุด ($) ก่อนปิดทุกออเดอร์



//+------------------------------------------------------------------+

//| ══════ RISK SETTINGS ══════                                       |

//+------------------------------------------------------------------+

extern string         _RISK_           = "======= ความเสี่ยง =======";

extern double         MaxSpread_Pip    = 10.0;          // Spread สูงสุด (pips)

extern ENUM_FRIDAY_MODE FridayMode     = FRI_NO_NEW;    // พฤติกรรมวันศุกร์

extern int            FridayCutoffHour = 23;            // ชม.ไทยหยุดเปิดใหม่ (โหมด CUTOFF)

extern int            FridayCutoffMin  = 1;             // นาทีไทยหยุดเปิดใหม่ (โหมด CUTOFF)

extern bool           MondayWait       = true;          // วันจันทร์: รอก่อนเทรด

extern int            MondayWaitHours  = 1;             // ชม.ที่รอหลังตลาดเปิดวันจันทร์



//+------------------------------------------------------------------+

//| ══════ NEWS FILTER ══════                                         |

//+------------------------------------------------------------------+

extern string         _NEWS_           = "======= กรองข่าว =======";

extern bool           UseNewsFilter    = true;          // เปิดใช้ตัวกรองข่าว

extern bool           FilterHigh       = true;          // กรองข่าวสำคัญมาก

extern bool           FilterMedium     = true;          // กรองข่าวสำคัญปานกลาง

extern bool           FilterLow        = false;         // กรองข่าวสำคัญน้อย

extern int            NewsMinsBefore   = 15;            // หยุดก่อนข่าว (นาที)

extern int            NewsMinsAfter    = 30;            // รอหลังข่าว (นาที)

extern int            NewsGMTOffset    = -5;            // ForexFactory = GMT-5



//+------------------------------------------------------------------+

//| ══════ TIME MANAGEMENT ══════                                     |

//+------------------------------------------------------------------+

extern string         _TIME_           = "======= จัดการเวลา =======";

extern bool           UseTimer         = false;         // เปิดใช้ตัวจำกัดเวลา

extern string         TradingStartTime = "7:00";        // เวลาเริ่มเทรด (server)

extern string         TradingEndTime   = "19:00";       // เวลาหยุดเทรด (server)



//+------------------------------------------------------------------+

//| ══════ DAY MANAGEMENT ══════                                      |

//+------------------------------------------------------------------+

extern string         _DAY_            = "======= จัดการวันเทรด =======";

extern bool           TradeMonday      = true;          // เทรดวันจันทร์

extern bool           TradeTuesday     = true;          // เทรดวันอังคาร

extern bool           TradeWednesday   = true;          // เทรดวันพุธ

extern bool           TradeThursday    = true;          // เทรดวันพฤหัส

// TradeFriday removed -> use FridayMode in RISK section



//+------------------------------------------------------------------+

//| ══════ DISPLAY ══════                                             |

//+------------------------------------------------------------------+

extern string         _DISP_           = "======= แสดงผล =======";

extern ENUM_DASH_MODE DashboardMode    = DASH_MINI;     // โหมดแดชบอร์ด

extern string         AccountLabel     = "A1";           // ชื่อบัญชี (A1,A2,A3) ดูใน Web

extern ENUM_PNL_SCOPE PnL_Scope       = PNL_SYMBOL;    // ขอบเขต P&L รายวัน/สัปดาห์

extern int            ServerToThai     = 4;             // ชม.ต่างจาก Server เป็นไทย



//+------------------------------------------------------------------+

//| INTERNAL CONSTANTS                                                |

//+------------------------------------------------------------------+

int      Slippage       = 50;

string   TradeComment   = "ClevrGold";

double   g_pipDiv       = 10.0;       // Points per pip (auto-detect in OnInit)

double   g_mgDistPts   = 150.0;      // MG distance in points (converted from pips)

int      g_maxSpreadPts = 100;       // Max spread in points (converted from pips)

color    BuyColor       = clrLime;

color    SellColor      = clrOrangeRed;

color    TitleColor     = clrGold;

color    TextColor      = clrWhite;

color    DimColor       = clrDarkGray;

color    PanelBG        = C'20,20,30';

color    PanelBorder    = C'50,50,70';



//+------------------------------------------------------------------+

//| GLOBALS                                                           |

//+------------------------------------------------------------------+

datetime g_lastBar        = 0;

string   g_lastAction     = "Starting...";

int      g_eaMode         = MODE_NORMAL;

double   g_dayPnL         = 0;

double   g_weekPnL        = 0;

double   g_totalPnL       = 0;

int      g_scalpTPCount   = 0;

int      g_scalpTPDay     = 0;

int      g_basketSLCount  = 0;

int      g_awDayCount     = 0;

int      g_awDayDate      = 0;

int      g_rcRound        = 0;

double   g_rcCurrentDD    = 0;

double   g_initDeposit    = 0;

datetime g_awSimStart     = 0;

double   g_awSimTotal     = 0;

bool     g_emergHedged    = false;

double   g_ddPeak         = 0;

double   g_ddCurrent      = 0;

bool     g_candleTrade    = false;   // Already traded this candle?



// Backtest: Pure Scalp Profit Tracking (TP only, ignore SL/AW)

double   g_scalpProfit    = 0;       // Total $ from TP hits only

double   g_scalpProfitDay = 0;       // Today's TP $ only

double   g_scalpProfitWk  = 0;       // This week's TP $ only

int      g_scalpDayDate   = 0;       // Day tracker for daily reset

int      g_scalpWeekDay   = 0;       // Week tracker for weekly reset



// News Filter globals

datetime g_newsTime[100];

string   g_newsImpact[100];

string   g_newsEvent[100];

int      g_newsCount      = 0;

datetime g_newsLastLoad   = 0;

string   g_newsStatus     = "";

string   g_nextNewsName   = "";

datetime g_nextNewsTime   = 0;

bool     g_newsBlock      = false;

string   g_upcomingNews[3];

color    g_upcomingClr[3];

int      g_upcomingCount  = 0;



// RSI/MA signal cache

string   g_rsiText        = "";

string   g_maText         = "";

string   g_signalText     = "";

int      g_signal         = 0;       // 1=Buy, -1=Sell, 0=None



//+------------------------------------------------------------------+

//| Expert initialization                                             |

//+------------------------------------------------------------------+

int OnInit()

{

   g_initDeposit  = AccountBalance();



   //--- Auto-detect pip size

   // XAUUSD (2 digits): 1 pip = 0.1 = 10 points

   // Forex 5-digit:     1 pip = 0.0001 = 10 points  

   // Forex 4-digit:     1 pip = 0.01 = 1 point

   if(Digits == 2 || Digits == 3 || Digits == 5)

      g_pipDiv = 10.0;

   else

      g_pipDiv = 1.0;

   Print("Pip: 1 pip = ", g_pipDiv, " points (Digits:", Digits, ")");



   //--- Convert pip configs to internal points

   g_mgDistPts    = MG_Distance_Pip * g_pipDiv;

   g_maxSpreadPts = (int)(MaxSpread_Pip * g_pipDiv);

   Print("MG Distance: ", MG_Distance_Pip, " pips = ", g_mgDistPts, " points");

   Print("Max Spread:  ", MaxSpread_Pip, " pips = ", g_maxSpreadPts, " points");

   g_awDayDate    = Day();

   g_scalpDayDate = Day();

   g_scalpWeekDay = DayOfWeek();



   Print("=== ClevrGold v1.0 ===");

   Print("Strategy:", EnumToString(StrategyType),

         " Dir:", EnumToString(TradeDirection),

         " Lot:", StartLot,

         " TP:", (TP_Mode==TP_DOLLAR ? "$"+DoubleToStr(TP_Dollar,1) : DoubleToStr(TP_Pips,0)+"pips"),

         " MG:x", LotMultiplier, " Steps:", MaxTradesPerSide);

   Print("AW Recovery: Magic:", AW_MagicNumber,

         " BasketSL:$", BasketSL_Dollar,

         " Emergency:$", EmergencyDD);

   Print("RSI:", RSI_Period, " OB:", RSI_OB, " OS:", RSI_OS,

         " MA:", MA_Period, " ", EnumToString(MA_Method));

   Print("News:", UseNewsFilter?"ON":"OFF",

         " Before:", NewsMinsBefore, "m After:", NewsMinsAfter, "m");

   Print("P&L Scope:", EnumToString(PnL_Scope),

         " (MT4 -> Account History tab -> set to 'All History' for accuracy)");

   Print("Friday:", EnumToString(FridayMode),

         " Monday:", MondayWait?"WAIT "+IntegerToString(MondayWaitHours)+"h":"OFF");



   if(UseNewsFilter && !IsTesting())

      LoadNewsFromWeb();



   //--- Recover WAIT_AW state after restart

   if(!IsTesting())

      RecoverAWState();



   return(INIT_SUCCEEDED);

}



//+------------------------------------------------------------------+

//| Expert deinitialization                                           |

//+------------------------------------------------------------------+

void OnDeinit(const int reason)

{

   if(IsTesting())

   {

      double realBal     = g_initDeposit + g_scalpProfit;

      double profitPct   = (g_initDeposit > 0) ? g_scalpProfit / g_initDeposit * 100.0 : 0;

      double avgTP       = (g_scalpTPCount > 0) ? g_scalpProfit / g_scalpTPCount : 0;

      Print("========================================");

      Print(" ClevrGold BACKTEST REPORT");

      Print("========================================");

      Print("Deposit:       $", DoubleToStr(g_initDeposit, 0));

      Print("REAL Balance:  $", DoubleToStr(realBal, 2),

            " (", (g_scalpProfit>=0?"+":""), DoubleToStr(profitPct, 1), "%)");

      Print("Scalp Profit:  $", DoubleToStr(g_scalpProfit, 2),

            " (TP only, SL/AW ignored)");

      Print("Total TP:      ", g_scalpTPCount, " rounds",

            "  Avg: $", DoubleToStr(avgTP, 2), " per TP");

      Print("AW Recovery:   ", g_basketSLCount, " times ($0 each, break even)");

      Print("AW Sim Offset: $", DoubleToStr(g_awSimTotal, 2));

      Print("Peak DD:       ", DoubleToStr(g_ddPeak, 1), "%");

      Print("MT4 Balance:   $", DoubleToStr(AccountBalance(), 2), " (includes SL losses)");

      Print("========================================");

   }

   ObjectsDeleteAll(0, "CG_");

   Comment("");

}



//+------------------------------------------------------------------+

//| Recover AW state after EA restart                                 |

//+------------------------------------------------------------------+

void RecoverAWState()

{

   int awOrd = 0, ourOrd = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol()) continue;

      if(OrderType() > OP_SELL) continue;

      if(OrderMagicNumber() == AW_MagicNumber) awOrd++;

      if(OrderMagicNumber() == MagicNumber)    ourOrd++;

   }

   if(awOrd > 0)

   {

      g_eaMode     = MODE_WAIT_AW;

      g_awSimStart = TimeCurrent();

      g_rcRound++;

      Print(">>> RESTART: Detected AW orders (", awOrd, ") -> WAIT AW");

   }

   else if(ourOrd > 0)

   {

      double ourPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

      if(ourPnL <= -BasketSL_Dollar)

      {

         g_eaMode     = MODE_WAIT_AW;

         g_awSimStart = TimeCurrent();

         g_rcRound++;

         Print(">>> RESTART: Orders in DD ($", DoubleToStr(MathAbs(ourPnL),1), ") -> WAIT AW");

      }

   }

}



//+------------------------------------------------------------------+

//| MAIN TICK                                                         |

//+------------------------------------------------------------------+

void OnTick()

{

   CalcDayPnL();

   CalcWeekPnL();

   TrackDD();



   //--- Reset daily counters

   if(Day() != g_awDayDate)

   {

      g_awDayCount  = 0;

      g_scalpTPDay  = 0;

      g_awDayDate   = Day();

   }



   //--- Reset scalp profit daily

   if(Day() != g_scalpDayDate)

   {

      g_scalpProfitDay = 0;

      g_scalpDayDate   = Day();

   }



   //--- Reset scalp profit weekly (Monday)

   if(DayOfWeek() == 1 && g_scalpWeekDay != 1)

   {

      g_scalpProfitWk = 0;

   }

   g_scalpWeekDay = DayOfWeek();



   //=========================================================

   // WAIT AW MODE

   //=========================================================

   if(g_eaMode == MODE_WAIT_AW)

   {

      HandleWaitAW();

      return;

   }



   //=========================================================

   // NORMAL MODE

   //=========================================================

   ManageTP();

   DrawTPLine();

   DrawMGLine();

   CheckBasketSL();



   if(g_eaMode != MODE_NORMAL)

   {

      DrawDash("WAIT AW");

      return;

   }



   if(CheckMaxDD())

   {

      DrawDash("DD LIMIT!");

      return;

   }



   if(CheckLossCut())

   {

      DrawDash("LOSS CUT!");

      return;

   }



   //--- News

   if(UseNewsFilter && !IsTesting())

      LoadNewsFromWeb();

   IsNewsTime();



   //=========================================================

   // MG runs EVERY tick (fast response)

   //=========================================================

   if(CanTrade())

      CheckMGOrders();



   //=========================================================

   // NEW ENTRY only on new bar

   //=========================================================

   if(!IsNewBar())

   {

      string waitStatus = GetWaitStatus();

      DrawDash(waitStatus);

      return;

   }



   //--- Reset candle trade flag on new bar

   g_candleTrade = false;



   //--- Analyze signal

   AnalyzeSignal();



   //--- Can trade?

   if(!CanTrade())

   {

      g_lastAction = "Cannot trade (spread/time/day)";

      DrawDash("PAUSED");

      return;

   }



   //--- Execute new entry (only when no orders)

   DoTrade();



   //--- Status

   string postStatus = GetWaitStatus();

   if(StringFind(g_lastAction, "SKIP") >= 0)

      postStatus = "SKIP";

   else if(CntOrd(OP_BUY) + CntOrd(OP_SELL) > 0)

      postStatus = "ACTIVE";

   DrawDash(postStatus);

}



//+------------------------------------------------------------------+

//| Get current wait status string                                    |

//+------------------------------------------------------------------+

string GetWaitStatus()

{

   if(g_newsBlock)

      return "NEWS STOP";

   if(IsFridayBlock())

   {

      int ord = CntOrd(OP_BUY) + CntOrd(OP_SELL);

      return (ord > 0) ? "FRI ACTIVE" : "FRI STOP";

   }

   if(MondayWait && DayOfWeek() == 1 && Hour() < MondayWaitHours)

   {

      int ord2 = CntOrd(OP_BUY) + CntOrd(OP_SELL);

      return (ord2 > 0) ? "ACTIVE" : "MON WAIT";

   }

   int total = CntOrd(OP_BUY) + CntOrd(OP_SELL);

   return (total > 0) ? "ACTIVE" : "WAITING";

}



//+------------------------------------------------------------------+

//| ═══════ SIGNAL ANALYSIS (RSI + MA) ═══════                        |

//+------------------------------------------------------------------+

void AnalyzeSignal()

{

   g_signal = 0;

   double rsi  = iRSI(Symbol(), 0, RSI_Period, RSI_Price, 1);

   double ma   = iMA(Symbol(), 0, MA_Period, MA_Shift, MA_Method, MA_Price, 1);

   double price = Close[1];



   //--- RSI Status

   bool rsiOB = (rsi >= RSI_OB);

   bool rsiOS = (rsi <= RSI_OS);

   g_rsiText = "RSI:" + DoubleToStr(rsi, 1);



   //--- MA Status

   bool aboveMA = (price > ma);

   bool belowMA = (price < ma);

   g_maText = "MA:" + DoubleToStr(ma, Digits);



   //--- Signal Logic (Mean-Reversion)

   // RSI Oversold + Price above MA = BUY signal

   // RSI Overbought + Price below MA = SELL signal

   // Medium Risk: relax condition (RSI only)

   if(StrategyType == STRAT_MEDIUM)

   {

      // Medium: trade every bar based on RSI zone

      if(rsiOS)

         g_signal = 1;   // Oversold -> Buy

      else if(rsiOB)

         g_signal = -1;  // Overbought -> Sell

      else

      {

         // Not in zone -> use MA direction

         if(price > ma) g_signal = 1;

         else if(price < ma) g_signal = -1;

      }

   }

   else // LOW RISK

   {

      // Low: need RSI + MA confirmation

      if(rsiOS && aboveMA)

         g_signal = 1;

      else if(rsiOB && belowMA)

         g_signal = -1;

   }



   //--- Apply Reverse Mode

   if(TradeDirection == DIR_REVERSE && g_signal != 0)

      g_signal = -g_signal;



   //--- Signal text

   g_signalText = (g_signal == 1) ? "BUY" : (g_signal == -1) ? "SELL" : "NONE";



   Print("ClevrGold: ", g_signalText,

         " RSI:", DoubleToStr(rsi, 1),

         " MA:", DoubleToStr(ma, Digits),

         " Price:", DoubleToStr(price, Digits));

}



//+------------------------------------------------------------------+

//| PEEK NEXT SIGNAL - Real-time preview from current bar (bar 0)    |

//| Returns: 1=BUY, -1=SELL, 0=NONE                                  |

//+------------------------------------------------------------------+

int PeekNextSignal()

{

   int sig = 0;

   double rsi0  = iRSI(Symbol(), 0, RSI_Period, RSI_Price, 0);  // Bar 0 (live)

   double ma0   = iMA(Symbol(), 0, MA_Period, MA_Shift, MA_Method, MA_Price, 0);

   double price0 = Close[0];  // Current price



   bool rsiOB0 = (rsi0 >= RSI_OB);

   bool rsiOS0 = (rsi0 <= RSI_OS);

   bool above0 = (price0 > ma0);

   bool below0 = (price0 < ma0);



   if(StrategyType == STRAT_MEDIUM)

   {

      if(rsiOS0)       sig = 1;

      else if(rsiOB0)  sig = -1;

      else

      {

         if(above0)    sig = 1;

         else if(below0) sig = -1;

      }

   }

   else // LOW RISK

   {

      if(rsiOS0 && above0)      sig = 1;

      else if(rsiOB0 && below0) sig = -1;

   }



   // Apply Reverse

   if(TradeDirection == DIR_REVERSE && sig != 0)

      sig = -sig;



   return sig;

}



//+------------------------------------------------------------------+

//| TRADE EXECUTION                                                   |

//+------------------------------------------------------------------+

void DoTrade()

{

   if(g_eaMode != MODE_NORMAL) return;



   //--- News block

   if(g_newsBlock)

   {

      g_lastAction = "NEWS STOP | " + g_nextNewsName;

      return;

   }



   int buys  = CntOrd(OP_BUY);

   int sells = CntOrd(OP_SELL);

   int total = buys + sells;



   //=== No orders -> Open new ===

   if(total == 0)

   {

      if(IsFridayBlock())

      {

         g_lastAction = "FRI STOP (no new orders)";

         return;

      }

      if(MondayWait && DayOfWeek() == 1 && Hour() < MondayWaitHours)

      {

         g_lastAction = "MON WAIT";

         return;

      }

      if(!IsTradingDay())

      {

         g_lastAction = "DAY OFF";

         return;

      }



      double baseLot = GetBaseLot();

      if(g_signal == 1 && AllowBuy)

      {

         OpenOrder(OP_BUY, baseLot);

         g_lastAction = "NEW BUY | " + g_signalText + (IsNightMode() ? " [NIGHT]" : "");

         g_candleTrade = true;

      }

      else if(g_signal == -1 && AllowSell)

      {

         OpenOrder(OP_SELL, baseLot);

         g_lastAction = "NEW SELL | " + g_signalText + (IsNightMode() ? " [NIGHT]" : "");

         g_candleTrade = true;

      }

      else

      {

         g_lastAction = "SKIP (no signal)";

      }

      return;

   }



   //=== Has orders -> MG is handled by CheckMGOrders() every tick ===

   //--- Just update status

   g_lastAction = "MG Active (Orders: " + IntegerToString(total) + ")";

}



//+------------------------------------------------------------------+

//| CHECK MG ORDERS - Runs every tick for responsive MG              |

//| Protected by order-count tracking (no cooldown hack needed)      |

//+------------------------------------------------------------------+

void CheckMGOrders()

{

   if(!UseMartingale) return;                            // MG disabled

   int buys  = CntOrd(OP_BUY);

   int sells = CntOrd(OP_SELL);

   if(buys == 0 && sells == 0) return;         // No orders = no MG

   if(buys > 0 && sells > 0) return;           // Both sides = no MG (shouldn't happen)



   //--- Safety: already hit BasketSL -> block MG

   double curPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   if(curPnL <= -BasketSL_Dollar) return;



   //--- Buy side MG

   if(buys > 0 && buys < MaxTradesPerSide)

   {

      if(CheckMGDistance(OP_BUY))

      {

         double lot = CalcMGLot(OP_BUY);

         OpenOrder(OP_BUY, lot);

         g_lastAction = "MG BUY #" + IntegerToString(buys + 1) +

                        " Lot:" + DoubleToStr(lot, 2);

         Print(">>> MG BUY #", buys + 1, " Lot:", lot,

               " LastPrice:", LastOrderPrice(OP_BUY));

      }

   }



   //--- Sell side MG

   if(sells > 0 && sells < MaxTradesPerSide)

   {

      if(CheckMGDistance(OP_SELL))

      {

         double lot = CalcMGLot(OP_SELL);

         OpenOrder(OP_SELL, lot);

         g_lastAction = "MG SELL #" + IntegerToString(sells + 1) +

                        " Lot:" + DoubleToStr(lot, 2);

         Print(">>> MG SELL #", sells + 1, " Lot:", lot,

               " LastPrice:", LastOrderPrice(OP_SELL));

      }

   }

}



//+------------------------------------------------------------------+

//| OPEN ORDER                                                        |

//+------------------------------------------------------------------+

void OpenOrder(int type, double lot)

{

   double price = (type == OP_BUY) ? Ask : Bid;



   // Thai time comment

   datetime thTime = TimeCurrent() + ServerToThai * 3600;

   string cmt = TradeComment + " " + TimeToStr(thTime, TIME_DATE|TIME_SECONDS);



   int ticket = OrderSend(Symbol(), type, lot, price, Slippage,

                           0, 0, cmt, MagicNumber, 0,

                           (type == OP_BUY) ? BuyColor : SellColor);



   if(ticket > 0)

      Print(">>> ClevrGold ", (type==OP_BUY?"BUY":"SELL"),

            " Lot:", DoubleToStr(lot, 2), " @", DoubleToStr(price, Digits));

   else

      Print(">>> ClevrGold FAILED! Err:", GetLastError(), " Lot:", lot);

}



//+------------------------------------------------------------------+

//| MARTINGALE LOT CALCULATION                                        |

//+------------------------------------------------------------------+

int GetThaiHour()

{

   // Thailand = GMT+7 always (no DST)

   datetime gmt = TimeGMT();

   return (TimeHour(gmt) + 7) % 24;

}



int GetThaiMinute()

{

   datetime gmt = TimeGMT();

   return TimeMinute(gmt);

}



bool IsNightMode()

{

   if(!UseNightMode) return false;

   int thHour = GetThaiHour();

   if(NightStartHour > NightEndHour)

      return (thHour >= NightStartHour || thHour < NightEndHour);

   else

      return (thHour >= NightStartHour && thHour < NightEndHour);

}



double GetBaseLot()

{

   return IsNightMode() ? NightLot : StartLot;

}



double CalcMGLot(int type)

{

   int c = CntOrd(type);

   double lot = GetBaseLot();

   for(int i = 0; i < c && i < MaxTradesPerSide; i++)

      lot *= LotMultiplier;

   return NormLot(MathMin(lot, MaxLotLimit));

}



//+------------------------------------------------------------------+

//| CHECK MG DISTANCE                                                 |

//| BUY MG:  price must DROP below last buy by distance (สวนทาง)      |

//| SELL MG: price must RISE above last sell by distance (สวนทาง)     |

//+------------------------------------------------------------------+

bool CheckMGDistance(int type)

{

   double last = LastOrderPrice(type);

   if(last <= 0) return false;  // No last price = don't open



   int c = CntOrd(type);

   if(c <= 0) return false;



   //--- Calculate required distance for this level

   double dist = g_mgDistPts;

   for(int i = 1; i < c; i++)

      dist *= MG_DistMulti;



   //--- Check AGAINST direction only!

   double diffPts = 0;

   if(type == OP_BUY)

   {

      // BUY: MG triggers when price DROPS (Ask < last buy price)

      diffPts = (last - Ask) / Point;

   }

   else

   {

      // SELL: MG triggers when price RISES (Bid > last sell price)

      diffPts = (Bid - last) / Point;

   }



   //--- Must be positive (price moved against us) AND >= distance

   if(diffPts < 0) return false;  // Price moved in our favor = no MG



   //--- Gap protection (optional)

   if(MG_GapProtect && diffPts > dist * 3.0) return false;



   return (diffPts >= dist);

}



//+------------------------------------------------------------------+

//| Calculate pips remaining until next MG triggers                   |

//| Returns: positive = pts left, 0 = ready, -1 = N/A                |

//+------------------------------------------------------------------+

double CalcMGPipsLeft(int type)

{

   int c = CntOrd(type);

   if(c <= 0 || MaxTradesPerSide <= 1 || c >= MaxTradesPerSide) return -1;



   double last = LastOrderPrice(type);

   if(last <= 0) return -1;



   // Required distance for next level

   double dist = g_mgDistPts;

   for(int i = 1; i < c; i++)

      dist *= MG_DistMulti;



   // Distance traveled AGAINST us

   double diffPts = 0;

   if(type == OP_BUY)

      diffPts = (last - Ask) / Point;    // Positive when price drops

   else

      diffPts = (Bid - last) / Point;    // Positive when price rises



   if(diffPts < 0) diffPts = 0;  // Price in our favor = full distance remaining



   double remain = dist - diffPts;

   if(remain < 0) remain = 0;

   return remain;

}



//+------------------------------------------------------------------+

//| MANAGE TP - Check every tick for fast close!                      |

//| Mode Dollar: close when PnL >= TP_Dollar                          |

//| Mode Pips:   close when PnL >= TP in pips (converted to $)       |

//+------------------------------------------------------------------+

void ManageTP()

{

   double tpTarget = GetTPTarget(OP_BUY);

   if(tpTarget <= 0) return;



   //=== BUY side ===

   double buyPnL = CalcPnL(OP_BUY);

   if(CntOrd(OP_BUY) > 0 && buyPnL >= tpTarget)

   {

      CloseAllType(OP_BUY);

      g_scalpTPCount++;

      g_scalpTPDay++;

      g_scalpProfit    += buyPnL;

      g_scalpProfitDay += buyPnL;

      g_scalpProfitWk  += buyPnL;

      g_lastAction = "BUY TP! $" + DoubleToStr(buyPnL, 2) +

                     " (target:$" + DoubleToStr(tpTarget, 2) + ")" +

                     " Total:$" + DoubleToStr(g_scalpProfit, 1);

      Print("ClevrGold ", g_lastAction);

   }



   //=== SELL side ===

   double sellPnL = CalcPnL(OP_SELL);

   if(CntOrd(OP_SELL) > 0 && sellPnL >= tpTarget)

   {

      CloseAllType(OP_SELL);

      g_scalpTPCount++;

      g_scalpTPDay++;

      g_scalpProfit    += sellPnL;

      g_scalpProfitDay += sellPnL;

      g_scalpProfitWk  += sellPnL;

      g_lastAction = "SELL TP! $" + DoubleToStr(sellPnL, 2) +

                     " (target:$" + DoubleToStr(tpTarget, 2) + ")" +

                     " Total:$" + DoubleToStr(g_scalpProfit, 1);

      Print("ClevrGold ", g_lastAction);

   }

}



//+------------------------------------------------------------------+

//| Draw Visual TP Line on chart                                      |

//| Shows horizontal line where price needs to reach for basket TP    |

//+------------------------------------------------------------------+

void DrawTPLine()

{

   string buyLine  = "CG_TPLine_BUY";

   string sellLine = "CG_TPLine_SELL";

   string buyLabel = "CG_TPLabel_BUY";

   string sellLabel = "CG_TPLabel_SELL";



   int buys  = CntOrd(OP_BUY);

   int sells = CntOrd(OP_SELL);



   //=== BUY TP Line ===

   if(buys > 0)

   {

      double tpPrice = CalcTPPrice(OP_BUY);

      if(tpPrice > 0)

      {

         if(ObjectFind(buyLine) < 0)

            ObjectCreate(buyLine, OBJ_HLINE, 0, 0, tpPrice);

         else

            ObjectSet(buyLine, OBJPROP_PRICE1, tpPrice);

         ObjectSet(buyLine, OBJPROP_COLOR, C'50,200,255');

         ObjectSet(buyLine, OBJPROP_STYLE, STYLE_DASH);

         ObjectSet(buyLine, OBJPROP_WIDTH, 1);

         ObjectSet(buyLine, OBJPROP_BACK, true);



         // Label

         string bTxt = "TP BUY $" + DoubleToStr(GetTPTarget(OP_BUY), 2) +

                       " @ " + DoubleToStr(tpPrice, Digits);

         if(ObjectFind(buyLabel) < 0)

            ObjectCreate(buyLabel, OBJ_TEXT, 0, Time[5], tpPrice);

         ObjectSet(buyLabel, OBJPROP_PRICE1, tpPrice);

         ObjectSet(buyLabel, OBJPROP_TIME1, Time[5]);

         ObjectSetText(buyLabel, bTxt, 8, "Arial", C'50,200,255');

      }

   }

   else

   {

      ObjectDelete(buyLine);

      ObjectDelete(buyLabel);

   }



   //=== SELL TP Line ===

   if(sells > 0)

   {

      double tpPrice2 = CalcTPPrice(OP_SELL);

      if(tpPrice2 > 0)

      {

         if(ObjectFind(sellLine) < 0)

            ObjectCreate(sellLine, OBJ_HLINE, 0, 0, tpPrice2);

         else

            ObjectSet(sellLine, OBJPROP_PRICE1, tpPrice2);

         ObjectSet(sellLine, OBJPROP_COLOR, C'255,120,80');

         ObjectSet(sellLine, OBJPROP_STYLE, STYLE_DASH);

         ObjectSet(sellLine, OBJPROP_WIDTH, 1);

         ObjectSet(sellLine, OBJPROP_BACK, true);



         // Label

         string sTxt = "TP SELL $" + DoubleToStr(GetTPTarget(OP_SELL), 2) +

                       " @ " + DoubleToStr(tpPrice2, Digits);

         if(ObjectFind(sellLabel) < 0)

            ObjectCreate(sellLabel, OBJ_TEXT, 0, Time[5], tpPrice2);

         ObjectSet(sellLabel, OBJPROP_PRICE1, tpPrice2);

         ObjectSet(sellLabel, OBJPROP_TIME1, Time[5]);

         ObjectSetText(sellLabel, sTxt, 8, "Arial", C'255,120,80');

      }

   }

   else

   {

      ObjectDelete(sellLine);

      ObjectDelete(sellLabel);

   }

}



//+------------------------------------------------------------------+

//| Calculate TP price level for basket                               |

//| BUY:  price needs to go UP to reach TP                            |

//| SELL: price needs to go DOWN to reach TP                          |

//+------------------------------------------------------------------+

double CalcTPPrice(int type)

{

   double tpTarget  = GetTPTarget(type);

   double currentPnL = CalcPnL(type);

   double totalLots = 0;



   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() != type) continue;

      totalLots += OrderLots();

   }

   if(totalLots <= 0) return 0;



   //--- How much $ more needed

   double remaining = tpTarget - currentPnL;



   //--- $ per price unit movement for this basket

   double tickVal  = MarketInfo(Symbol(), MODE_TICKVALUE);

   double tickSize = MarketInfo(Symbol(), MODE_TICKSIZE);

   if(tickSize <= 0 || tickVal <= 0) return 0;



   double dollarPerPriceUnit = totalLots * tickVal / tickSize;

   if(dollarPerPriceUnit <= 0) return 0;



   double priceMove = remaining / dollarPerPriceUnit;



   //--- TP price

   if(type == OP_BUY)

      return Bid + priceMove;    // Price needs to go UP

   else

      return Ask - priceMove;    // Price needs to go DOWN

}



//+------------------------------------------------------------------+

//| Draw Visual MG Line on chart                                      |

//| Shows where next Martingale order will trigger                    |

//+------------------------------------------------------------------+

void DrawMGLine()

{

   string buyLine   = "CG_MGLine_BUY";

   string sellLine  = "CG_MGLine_SELL";

   string buyLabel  = "CG_MGLabel_BUY";

   string sellLabel = "CG_MGLabel_SELL";



   int buys  = CntOrd(OP_BUY);

   int sells = CntOrd(OP_SELL);



   //=== BUY MG Line (price must DROP to trigger) ===

   if(buys > 0 && buys < MaxTradesPerSide)

   {

      double last = LastOrderPrice(OP_BUY);

      if(last > 0)

      {

         // MG distance for next level

         double dist = g_mgDistPts;

         for(int i = 1; i < buys; i++)

            dist *= MG_DistMulti;



         double mgPrice = last - dist * Point;  // Below last buy

         double nextLot = CalcMGLot(OP_BUY);

         double pipDist = dist / g_pipDiv;



         if(ObjectFind(buyLine) < 0)

            ObjectCreate(buyLine, OBJ_HLINE, 0, 0, mgPrice);

         else

            ObjectSet(buyLine, OBJPROP_PRICE1, mgPrice);

         ObjectSet(buyLine, OBJPROP_COLOR, C'255,255,100');

         ObjectSet(buyLine, OBJPROP_STYLE, STYLE_DOT);

         ObjectSet(buyLine, OBJPROP_WIDTH, 1);

         ObjectSet(buyLine, OBJPROP_BACK, true);



         string bTxt = "MG #" + IntegerToString(buys+1) +

                       " BUY " + DoubleToStr(nextLot, 2) +

                       " @ " + DoubleToStr(mgPrice, Digits) +

                       " (" + DoubleToStr(pipDist, 1) + " pips)";

         if(ObjectFind(buyLabel) < 0)

            ObjectCreate(buyLabel, OBJ_TEXT, 0, Time[15], mgPrice);

         ObjectSet(buyLabel, OBJPROP_PRICE1, mgPrice);

         ObjectSet(buyLabel, OBJPROP_TIME1, Time[15]);

         ObjectSetText(buyLabel, bTxt, 8, "Arial", C'255,255,100');

      }

   }

   else

   {

      ObjectDelete(buyLine);

      ObjectDelete(buyLabel);

   }



   //=== SELL MG Line (price must RISE to trigger) ===

   if(sells > 0 && sells < MaxTradesPerSide)

   {

      double lastS = LastOrderPrice(OP_SELL);

      if(lastS > 0)

      {

         double distS = g_mgDistPts;

         for(int j = 1; j < sells; j++)

            distS *= MG_DistMulti;



         double mgPriceS = lastS + distS * Point;  // Above last sell

         double nextLotS = CalcMGLot(OP_SELL);

         double pipDistS = distS / g_pipDiv;



         if(ObjectFind(sellLine) < 0)

            ObjectCreate(sellLine, OBJ_HLINE, 0, 0, mgPriceS);

         else

            ObjectSet(sellLine, OBJPROP_PRICE1, mgPriceS);

         ObjectSet(sellLine, OBJPROP_COLOR, C'255,255,100');

         ObjectSet(sellLine, OBJPROP_STYLE, STYLE_DOT);

         ObjectSet(sellLine, OBJPROP_WIDTH, 1);

         ObjectSet(sellLine, OBJPROP_BACK, true);



         string sTxt = "MG #" + IntegerToString(sells+1) +

                       " SELL " + DoubleToStr(nextLotS, 2) +

                       " @ " + DoubleToStr(mgPriceS, Digits) +

                       " (" + DoubleToStr(pipDistS, 1) + " pips)";

         if(ObjectFind(sellLabel) < 0)

            ObjectCreate(sellLabel, OBJ_TEXT, 0, Time[15], mgPriceS);

         ObjectSet(sellLabel, OBJPROP_PRICE1, mgPriceS);

         ObjectSet(sellLabel, OBJPROP_TIME1, Time[15]);

         ObjectSetText(sellLabel, sTxt, 8, "Arial", C'255,255,100');

      }

   }

   else

   {

      ObjectDelete(sellLine);

      ObjectDelete(sellLabel);

   }

}



//+------------------------------------------------------------------+

//| Get TP target in $ based on mode                                  |

//+------------------------------------------------------------------+

double GetTPTarget(int type)

{

   //=== Dollar mode: simple! ===

   if(TP_Mode == TP_DOLLAR)

      return TP_Dollar;



   //=== Pips mode: convert pips to $ ===

   if(TP_Pips <= 0) return 0;



   double totalLots = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() > OP_SELL) continue;

      totalLots += OrderLots();

   }

   if(totalLots <= 0) return 0;



   // Pip value: how much $ per pip per lot

   double tickVal  = MarketInfo(Symbol(), MODE_TICKVALUE);

   double tickSize = MarketInfo(Symbol(), MODE_TICKSIZE);

   if(tickSize <= 0) return TP_Dollar; // fallback



   double pipVal = tickVal / tickSize * Point;

   double target = TP_Pips * pipVal * totalLots;

   if(target < 0.10) target = 0.10;

   return target;

}



//+------------------------------------------------------------------+

//| BASKET SL -> WAIT AW                                              |

//+------------------------------------------------------------------+

void CheckBasketSL()

{

   int totalOrders = CntOrd(OP_BUY) + CntOrd(OP_SELL);

   if(totalOrders == 0) return;



   g_totalPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);



   if(g_totalPnL <= -BasketSL_Dollar)

   {

      if(Day() != g_awDayDate)

      {

         g_awDayCount = 0;

         g_awDayDate  = Day();

      }

      g_basketSLCount++;

      g_awDayCount++;

      g_eaMode      = MODE_WAIT_AW;

      g_rcRound++;

      g_rcCurrentDD = 0;

      g_awSimStart  = TimeCurrent();

      g_lastAction  = "DD HIT! FREEZE -> Wait AW Recovery";

      Print(">>> ClevrGold BASKET SL #", g_basketSLCount,

            " PnL:$", DoubleToStr(g_totalPnL, 2),

            " -> WAIT AW (Magic:", AW_MagicNumber, ")");

   }

}



//+------------------------------------------------------------------+

//| HANDLE WAIT AW MODE                                               |

//+------------------------------------------------------------------+

void HandleWaitAW()

{

   double awNetPnL = AllOrdersPnL();

   double awDD     = -awNetPnL;

   if(awDD > g_rcCurrentDD) g_rcCurrentDD = awDD;



   //=========================================================

   // BACKTEST SIMULATION (AW simulated after 20 minutes)

   //=========================================================

   if(IsTesting())

   {

      int elapsed = (int)(TimeCurrent() - g_awSimStart);

      if(elapsed >= 1200)

      {

         double lossAmt = 0;

         for(int i = OrdersTotal()-1; i >= 0; i--)

         {

            if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

            if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

            if(OrderType() > OP_SELL) continue;

            lossAmt += OrderProfit() + OrderSwap() + OrderCommission();

         }

         CloseAllOrders();

         g_awSimTotal += MathAbs(lossAmt);

         g_eaMode      = MODE_NORMAL;

         g_lastAction  = "AW SIM OK! Round #" + IntegerToString(g_rcRound);

         Print(">>> ClevrGold AW SIM #", g_rcRound,

               " DD:$", DoubleToStr(MathAbs(lossAmt), 1), " -> Recovered");

         DrawDash("ACTIVE");

         return;

      }

      int secLeft = 1200 - elapsed;

      g_lastAction = "AW SIM... " + IntegerToString(secLeft/60) + ":" +

                     StringFormat("%02d", secLeft%60) + " left";

      DrawDash("AW SIM");

      return;

   }



   //=========================================================

   // LIVE: Wait for real AW Recovery EA

   //=========================================================

   int ourOrders = CntOrd(OP_BUY) + CntOrd(OP_SELL);

   int awOrders  = CntAWOrders();



   //--- Emergency Hedge

   if(!g_emergHedged && EmergencyDD > 0)

   {

      double ourPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

      if(MathAbs(ourPnL) >= EmergencyDD && awOrders == 0)

      {

         double buyPnL  = CalcPnL(OP_BUY);

         double sellPnL = CalcPnL(OP_SELL);

         int loseSide   = (buyPnL < sellPnL) ? OP_BUY : OP_SELL;

         int hedgeDir   = (loseSide == OP_BUY) ? OP_SELL : OP_BUY;

         double hedgeLot = CalcTotalLots(loseSide);



         if(hedgeLot > 0)

         {

            double price  = (hedgeDir == OP_BUY) ? Ask : Bid;

            int ticket = OrderSend(Symbol(), hedgeDir, hedgeLot, price,

                                    Slippage, 0, 0, "CG EMERGENCY",

                                    MagicNumber, 0, clrRed);

            if(ticket > 0)

            {

               g_emergHedged = true;

               Print(">>> EMERGENCY HEDGE! DD:$", DoubleToStr(MathAbs(ourPnL), 1));

            }

         }

      }

   }



   //--- AW done?

   if(awOrders == 0 && ourOrders == 0)

   {

      g_eaMode      = MODE_NORMAL;

      g_emergHedged = false;

      g_lastAction  = "AW DONE! Resuming";

      Print(">>> ClevrGold: AW Recovery finished.");

      DrawDash("ACTIVE");

      return;

   }



   if(awOrders == 0 && ourOrders > 0)

   {

      double remainPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

      if(remainPnL >= 0)

      {

         CloseAllOrders();

         g_eaMode      = MODE_NORMAL;

         g_emergHedged = false;

         g_lastAction  = "AW DONE + TP! $" + DoubleToStr(remainPnL, 1);

         DrawDash("ACTIVE");

         return;

      }

      g_lastAction = "FROZEN | Ours:" + IntegerToString(ourOrders) +

                     " PnL:$" + DoubleToStr(remainPnL, 1);

      DrawDash("WAIT AW");

      return;

   }



   g_lastAction = "FROZEN | Ours:" + IntegerToString(ourOrders) +

                  " AW:" + IntegerToString(awOrders) +

                  " Net:$" + DoubleToStr(awNetPnL, 1) +

                  (g_emergHedged ? " [HEDGED]" : "");

   DrawDash(g_emergHedged ? "EMERGENCY" : "WAIT AW");

}



//+------------------------------------------------------------------+

//| ═══════ UTILITY FUNCTIONS ═══════                                 |

//+------------------------------------------------------------------+



//--- New bar detection

bool IsNewBar()

{

   if(g_lastBar != Time[0])

   {

      g_lastBar = Time[0];

      return true;

   }

   return false;

}



//--- Can trade check

bool CanTrade()

{

   int sp = (int)MarketInfo(Symbol(), MODE_SPREAD);

   if(sp > g_maxSpreadPts) return false;

   if(!IsTradingDay()) return false;



   if(UseTimer)

   {

      datetime startT = StringToTime(TradingStartTime);

      datetime endT   = StringToTime(TradingEndTime);

      datetime nowT   = StringToTime(TimeToStr(TimeCurrent(), TIME_MINUTES));

      if(startT < endT)

      {

         if(nowT < startT || nowT >= endT) return false;

      }

      else

      {

         if(nowT < startT && nowT >= endT) return false;

      }

   }

   return true;

}



//--- Trading day check

bool IsTradingDay()

{

   int dow = DayOfWeek();

   if(dow == 1 && !TradeMonday)    return false;

   if(dow == 2 && !TradeTuesday)   return false;

   if(dow == 3 && !TradeWednesday) return false;

   if(dow == 4 && !TradeThursday)  return false;

   // Friday handled by FridayMode (not blocked here)

   if(dow == 0 || dow == 6)        return false;

   return true;

}



//--- Friday: should we block NEW first entry?

//    Returns true = don't open new entry (but MG/TP continue!)

bool IsFridayBlock()

{

   if(DayOfWeek() != 5) return false;

   if(FridayMode == FRI_NORMAL) return false;

   if(FridayMode == FRI_NO_NEW) return true;   // Block all new on Friday

   // FRI_CUTOFF: block after Thai cutoff time

   int thHour = GetThaiHour();

   int thMin  = GetThaiMinute();

   if(thHour > FridayCutoffHour) return true;

   if(thHour == FridayCutoffHour && thMin >= FridayCutoffMin) return true;

   return false;

}



//--- Max DD check

bool CheckMaxDD()

{

   if(MaxDD_Percent <= 0) return false;

   double bal = AccountBalance();

   double eq  = AccountEquity();

   if(bal <= 0) return false;

   return (((bal - eq) / bal) * 100.0 >= MaxDD_Percent);

}



//--- Loss Cut check

bool CheckLossCut()

{

   if(LossCutValue <= 0) return false;

   double bal = AccountBalance();

   double eq  = AccountEquity();

   if(bal - eq >= LossCutValue)

   {

      CloseAllOrders();

      g_lastAction = "LOSS CUT! -$" + DoubleToStr(bal - eq, 1);

      return true;

   }

   return false;

}



//--- Count orders by type

int CntOrd(int type)

{

   int c = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() == type) c++;

   }

   return c;

}



//--- Count AW Recovery orders

int CntAWOrders()

{

   int c = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != AW_MagicNumber) continue;

      if(OrderType() <= OP_SELL) c++;

   }

   return c;

}



//--- Last order price

double LastOrderPrice(int type)

{

   int maxTicket = 0;

   double p = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() != type) continue;

      if(OrderTicket() > maxTicket)

      {

         maxTicket = OrderTicket();

         p = OrderOpenPrice();

      }

   }

   return p;

}



//--- Calculate PnL by type

double CalcPnL(int type)

{

   double p = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() != type) continue;

      p += OrderProfit() + OrderSwap() + OrderCommission();

   }

   return p;

}



//--- All orders PnL (Main + AW)

double AllOrdersPnL()

{

   double pnl = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol()) continue;

      int mg = OrderMagicNumber();

      if(mg != MagicNumber && mg != AW_MagicNumber) continue;

      pnl += OrderProfit() + OrderSwap() + OrderCommission();

   }

   return pnl;

}



//--- Total lots per side

double CalcTotalLots(int type)

{

   double lots = 0;

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() == type) lots += OrderLots();

   }

   return lots;

}



//--- Close all by type

void CloseAllType(int type)

{

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() != type) continue;

      double pr = (type == OP_BUY) ? Bid : Ask;

      bool res = OrderClose(OrderTicket(), OrderLots(), pr, Slippage, clrYellow);

      if(!res) Print("CloseAllType Err:", GetLastError());

   }

}



//--- Close all orders

void CloseAllOrders()

{

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

      if(OrderType() > OP_SELL) continue;

      double pr = (OrderType() == OP_BUY) ? Bid : Ask;

      bool res = OrderClose(OrderTicket(), OrderLots(), pr, Slippage, clrRed);

      if(!res) Print("CloseAllOrders Err:", GetLastError());

   }

}



//--- Normalize lot

double NormLot(double lot)

{

   double mn = MarketInfo(Symbol(), MODE_MINLOT);

   double mx = MarketInfo(Symbol(), MODE_MAXLOT);

   double st = MarketInfo(Symbol(), MODE_LOTSTEP);

   lot = MathMax(mn, lot);

   lot = MathMin(mx, lot);

   lot = MathMin(MaxLotLimit, lot);

   // Use Ceil so MG multiplier works with small lots

   // e.g. 0.01 × 1.25 = 0.0125 → Ceil → 0.02 (not Floor → 0.01)

   return NormalizeDouble(MathCeil(lot / st) * st, 2);

}



//+------------------------------------------------------------------+

//| P&L Helper: Check if order matches PnL scope filter              |

//+------------------------------------------------------------------+

bool MatchPnLScope(int magicNum, string sym)

{

   if(PnL_Scope == PNL_THIS_EA)

      return (sym == Symbol() && magicNum == MagicNumber);

   if(PnL_Scope == PNL_SYMBOL)

      return (sym == Symbol());

   // PNL_ACCOUNT = everything

   return true;

}



//+------------------------------------------------------------------+

//| Day P&L = Closed today (from history) + Floating open orders     |

//| Scans MT4 history — make sure Account History tab = "All History"|

//+------------------------------------------------------------------+

void CalcDayPnL()

{

   g_dayPnL = 0;

   datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE));



   //--- Realized: orders CLOSED today

   for(int j = OrdersHistoryTotal()-1; j >= 0; j--)

   {

      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;

      if(OrderType() > OP_SELL) continue;  // skip pending/cancelled

      if(!MatchPnLScope(OrderMagicNumber(), OrderSymbol())) continue;

      if(OrderCloseTime() >= todayStart)

         g_dayPnL += OrderProfit() + OrderSwap() + OrderCommission();

   }



   //--- Unrealized: floating open orders

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderType() > OP_SELL) continue;

      if(!MatchPnLScope(OrderMagicNumber(), OrderSymbol())) continue;

      g_dayPnL += OrderProfit() + OrderSwap() + OrderCommission();

   }

}



//+------------------------------------------------------------------+

//| Week P&L = Closed since Monday 00:00 + Floating                  |

//+------------------------------------------------------------------+

void CalcWeekPnL()

{

   g_weekPnL = 0;



   //--- Calculate Monday 00:00

   datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE));

   int dow = DayOfWeek();

   int daysBack = (dow == 0) ? 6 : dow - 1;

   datetime mondayStart = todayStart - daysBack * 86400;



   //--- Realized: orders CLOSED since Monday

   for(int j = OrdersHistoryTotal()-1; j >= 0; j--)

   {

      if(!OrderSelect(j, SELECT_BY_POS, MODE_HISTORY)) continue;

      if(OrderType() > OP_SELL) continue;

      if(!MatchPnLScope(OrderMagicNumber(), OrderSymbol())) continue;

      if(OrderCloseTime() >= mondayStart)

         g_weekPnL += OrderProfit() + OrderSwap() + OrderCommission();

   }



   //--- Unrealized: floating open orders

   for(int i = OrdersTotal()-1; i >= 0; i--)

   {

      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

      if(OrderType() > OP_SELL) continue;

      if(!MatchPnLScope(OrderMagicNumber(), OrderSymbol())) continue;

      g_weekPnL += OrderProfit() + OrderSwap() + OrderCommission();

   }

}



//--- Track DD

void TrackDD()

{

   double bal = AccountBalance();

   double eq  = AccountEquity();

   if(bal <= 0) return;

   g_ddCurrent = ((bal - eq) / bal) * 100.0;

   if(g_ddCurrent < 0) g_ddCurrent = 0;

   if(g_ddCurrent > g_ddPeak) g_ddPeak = g_ddCurrent;

}



//+------------------------------------------------------------------+

//| ═══════ NEWS FILTER ═══════                                       |

//+------------------------------------------------------------------+

void LoadNewsFromWeb()

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

      int err = GetLastError();

      if(err == 4060)

         Print("NEWS: Add URL to MT4 -> Tools -> Options -> Expert Advisors");

      else

         Print("NEWS: WebRequest failed, error: ", err);

      g_newsStatus = "LOAD FAIL";

      return;

   }



   string json = CharArrayToString(result);

   g_newsCount = 0;

   int pos = 0;



   while(pos < StringLen(json) && g_newsCount < 100)

   {

      int objStart = StringFind(json, "{", pos);

      if(objStart < 0) break;

      int objEnd = StringFind(json, "}", objStart);

      if(objEnd < 0) break;

      string obj = StringSubstr(json, objStart, objEnd - objStart + 1);

      pos = objEnd + 1;



      if(StringFind(obj, "\"USD\"") < 0) continue;



      string impact = "";

      if(StringFind(obj, "\"High\"") >= 0)        impact = "High";

      else if(StringFind(obj, "\"Medium\"") >= 0)  impact = "Medium";

      else if(StringFind(obj, "\"Low\"") >= 0)     impact = "Low";

      else continue;



      if(impact == "High" && !FilterHigh)     continue;

      if(impact == "Medium" && !FilterMedium) continue;

      if(impact == "Low" && !FilterLow)       continue;



      int dateStart = StringFind(obj, "\"date\":\"");

      if(dateStart < 0) continue;

      dateStart += 8;

      int dateEnd = StringFind(obj, "\"", dateStart);

      string dateStr = StringSubstr(obj, dateStart, dateEnd - dateStart);

      datetime eventTime = ParseNewsDate(dateStr);

      if(eventTime <= 0) continue;



      string title = "";

      int titleStart = StringFind(obj, "\"title\":\"");

      if(titleStart >= 0)

      {

         titleStart += 9;

         int titleEnd = StringFind(obj, "\"", titleStart);

         title = StringSubstr(obj, titleStart, titleEnd - titleStart);

      }



      g_newsTime[g_newsCount]   = eventTime;

      g_newsImpact[g_newsCount] = impact;

      g_newsEvent[g_newsCount]  = title;

      g_newsCount++;

   }



   g_newsLastLoad = TimeCurrent();

   Print("NEWS: Loaded ", g_newsCount, " USD events");

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

   int diff = serverGMT - NewsGMTOffset;

   hour += diff;

   while(hour >= 24) { hour -= 24; day++; }

   while(hour < 0)   { hour += 24; day--; }



   string dtStr = StringFormat("%04d.%02d.%02d %02d:%02d:00", year, month, day, hour, min);

   return StringToTime(dtStr);

}



bool IsNewsTime()

{

   if(!UseNewsFilter || g_newsCount == 0)

   {

      g_newsBlock = false;

      g_upcomingCount = 0;

      return false;

   }



   datetime now = TimeCurrent();

   g_nextNewsName = "";

   g_nextNewsTime = 0;

   g_newsBlock    = false;

   g_upcomingCount = 0;

   for(int k = 0; k < 3; k++) { g_upcomingNews[k] = ""; g_upcomingClr[k] = DimColor; }



   // Check blocking zone

   for(int i = 0; i < g_newsCount; i++)

   {

      datetime before = g_newsTime[i] - NewsMinsBefore * 60;

      datetime after  = g_newsTime[i] + NewsMinsAfter * 60;

      if(now >= before && now <= after)

      {

         g_newsBlock    = true;

         g_nextNewsName = g_newsImpact[i] + ": " + g_newsEvent[i];

         g_nextNewsTime = g_newsTime[i];

         if(now < g_newsTime[i])

            g_newsStatus = "PRE-NEWS " + IntegerToString((int)(g_newsTime[i]-now)/60) + "m";

         else

            g_newsStatus = "POST-NEWS " + IntegerToString((int)(now-g_newsTime[i])/60) + "m";

         break;

      }

   }



   // Collect upcoming for dashboard

   datetime upTimes[100];

   int upIndex[100];

   ArrayInitialize(upTimes, 0);

   ArrayInitialize(upIndex, 0);

   int upTotal = 0;

   for(int i = 0; i < g_newsCount; i++)

   {

      if(g_newsTime[i] + NewsMinsAfter * 60 > now)

      {

         upTimes[upTotal]  = g_newsTime[i];

         upIndex[upTotal]  = i;

         upTotal++;

      }

   }

   // Sort ascending

   for(int a = 0; a < upTotal - 1; a++)

      for(int b = a + 1; b < upTotal; b++)

         if(upTimes[b] < upTimes[a])

         {

            datetime tmpT = upTimes[a]; upTimes[a] = upTimes[b]; upTimes[b] = tmpT;

            int tmpI = upIndex[a]; upIndex[a] = upIndex[b]; upIndex[b] = tmpI;

         }



   int picked = 0;

   for(int j = 0; j < upTotal && picked < 3; j++)

   {

      int idx = upIndex[j];

      string impact  = g_newsImpact[idx];

      string evtName = g_newsEvent[idx];

      datetime evtTime = g_newsTime[idx];



      string timeStr = "";

      bool isActive = (now >= evtTime - NewsMinsBefore * 60 && now <= evtTime + NewsMinsAfter * 60);

      if(isActive)

         timeStr = (now < evtTime) ?

            "PRE " + IntegerToString((int)(evtTime - now) / 60) + "m" :

            "POST " + IntegerToString((int)(now - evtTime) / 60) + "m";

      else

      {

         int ml = (int)(evtTime - now) / 60;

         if(ml < 60)       timeStr = IntegerToString(ml) + "m";

         else if(ml < 1440) timeStr = IntegerToString(ml/60) + "h" + IntegerToString(ml%60) + "m";

         else               timeStr = IntegerToString(ml/1440) + "d";

      }



      string impIcon = "";

      color impClr   = DimColor;

      if(impact == "High")

      {

         impIcon = "!!";

         impClr  = isActive ? C'255,80,80' : C'255,130,100';

      }

      else if(impact == "Medium")

      {

         impIcon = "! ";

         impClr  = isActive ? C'255,180,60' : C'255,200,120';

      }

      else

      {

         impIcon = ". ";

         impClr  = DimColor;

      }



      string shortName = evtName;

      if(StringLen(shortName) > 22)

         shortName = StringSubstr(shortName, 0, 22) + "..";



      g_upcomingNews[picked] = impIcon + " " + timeStr + " " + shortName;

      g_upcomingClr[picked]  = impClr;

      picked++;

   }

   g_upcomingCount = picked;



   if(!g_newsBlock && g_upcomingCount > 0)

   {

      int firstIdx = upIndex[0];

      g_nextNewsName = g_newsImpact[firstIdx] + ": " + g_newsEvent[firstIdx];

      g_nextNewsTime = g_newsTime[firstIdx];

      int ml2 = (int)(g_nextNewsTime - now) / 60;

      if(ml2 < 60)       g_newsStatus = "Next: " + IntegerToString(ml2) + "m";

      else if(ml2 < 1440) g_newsStatus = "Next: " + IntegerToString(ml2/60) + "h";

      else                g_newsStatus = "Next: " + IntegerToString(ml2/1440) + "d";

   }

   else if(!g_newsBlock)

      g_newsStatus = "No news";



   return g_newsBlock;

}



//+------------------------------------------------------------------+

//| ═══════ DASHBOARD ═══════                                         |

//| LIVE = MT4 Mobile style (Balance/Equity/Margin/Orders/News)       |

//| BACKTEST = Scalp Profit tracker                                   |

//+------------------------------------------------------------------+

void DrawDash(string status)

{

   if(DashboardMode == DASH_OFF) return;



   //--- Throttle

   static uint lastDrawMs = 0;

   uint nowMs    = GetTickCount();

   uint interval = IsTesting() ? 2000 : 500;

   if(nowMs - lastDrawMs < interval) return;

   lastDrawMs = nowMs;



   int px = 15;    // Panel X

   int py = 18;    // Panel Y

   int pw = 280;   // Panel width (wider for mobile style)

   int LH = 18;    // Line height

   int cx = px + 12;  // Content X (left label)

   int vx = px + pw - 15; // Value X (right-aligned)



   //==============================================================

   // BACKTEST MODE

   //==============================================================

   if(IsTesting())

   {

      DrawDashBacktest(status, px, py, pw, LH, cx, vx);

      return;

   }

   //==============================================================

   // MINI DASHBOARD

   //==============================================================

   if(DashboardMode == DASH_MINI)

   {

      DrawDashMini(status, px, py);

      return;

   }

   //==============================================================

   // LIVE MODE: MT4 Mobile Style

   //==============================================================



   //--- Calculate panel height dynamically

   int panelH = 0;

   int totalOrders = CntOrd(OP_BUY) + CntOrd(OP_SELL);

   panelH += 60;    // Header (title + PnL)

   panelH += 230;   // Account section (Bal/Eq/Margin/PnL etc)

   panelH += 70;    // Signal + DD Meter + Next Signal

   panelH += 30 + totalOrders * 22;  // Orders section

   panelH += 40;    // Session + Status

   if(UseNewsFilter) panelH += 20 + g_upcomingCount * 16 + 20;

   panelH += 50;    // Bottom buttons + action

   if(panelH < 400) panelH = 400;



   CreateBG("CG_bg", px, py, pw, panelH, PanelBG);

   CreateBG("CG_border", px, py, pw, 2, TitleColor);



   int y = py + 10;



   //=== Title ===

   Lab("title", cx, y, "ClevrGold v1.0", TitleColor, 11);

   //--- Date right-aligned

   datetime thTime = TimeCurrent() + ServerToThai * 3600;

   LabR("date", vx, y + 2, TimeToStr(thTime, TIME_SECONDS), C'140,140,160', 8);

   y += 22;



   //=== PnL Header (big, colored like mobile app) ===

   double netP = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   color pnlClr = (netP >= 0) ? C'100,230,100' : C'255,80,80';

   string pnlSign = (netP >= 0) ? "+" : "";

   Lab("pnl_big", cx, y, pnlSign + DoubleToStr(netP, 2) + " USD", pnlClr, 13);

   y += 24;



   //=== Thin separator ===

   CreateBG("CG_sep1", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 8;



   //=== Balance ===

   double bal = AccountBalance();

   LabDot(cx, vx, y, "Balance:", DoubleToStr(bal, 2), TextColor, TextColor, 10);

   y += LH + 4;



   //=== Equity ===

   double eq = AccountEquity();

   color eqClr = (eq >= bal) ? C'100,230,100' : C'255,80,80';

   LabDot(cx, vx, y, "Equity:", DoubleToStr(eq, 2), TextColor, eqClr, 10);

   y += LH + 4;



   //=== Free Margin ===

   double freeMg = AccountFreeMargin();

   LabDot(cx, vx, y, "Free Margin:", DoubleToStr(freeMg, 2), TextColor, TextColor, 10);

   y += LH + 4;



   //=== Margin Level ===

   double mgLevel = 0;

   if(AccountMargin() > 0)

      mgLevel = AccountEquity() / AccountMargin() * 100.0;

   color mgClr = (mgLevel > 500) ? C'100,230,100' : (mgLevel > 200) ? C'255,220,80' : C'255,80,80';

   string mgText = (AccountMargin() > 0) ? DoubleToStr(mgLevel, 2) + " %" : "-- %";

   LabDot(cx, vx, y, "Margin Level:", mgText, TextColor, mgClr, 10);

   y += LH + 4;



   //=== Margin Used ===

   double mgUsed = AccountMargin();

   LabDot(cx, vx, y, "Margin:", DoubleToStr(mgUsed, 2), TextColor, TextColor, 10);

   y += LH + 4;



   //=== Spread ===

   int sp = (int)MarketInfo(Symbol(), MODE_SPREAD);

   color spClr = (sp <= g_maxSpreadPts/2) ? C'100,230,100' :

                 (sp <= g_maxSpreadPts) ? C'255,220,80' : C'255,100,80';

   LabDot(cx, vx, y, "Spread:", DoubleToStr(sp / g_pipDiv, 1) + " pips", TextColor, spClr, 10);

   y += LH + 4;



   //=== Daily P&L (realized = closed orders today) ===

   string daySign = (g_dayPnL >= 0) ? "+" : "";

   color  dayClr  = (g_dayPnL >= 0) ? C'100,230,100' : C'255,80,80';

   LabDot(cx, vx, y, "Daily P&L:", daySign + DoubleToStr(g_dayPnL, 2), TextColor, dayClr, 10);

   y += LH + 4;



   //=== Weekly P&L (realized = closed orders this week) ===

   string wkSign = (g_weekPnL >= 0) ? "+" : "";

   color  wkClr  = (g_weekPnL >= 0) ? C'100,230,100' : C'255,80,80';

   LabDot(cx, vx, y, "Weekly P&L:", wkSign + DoubleToStr(g_weekPnL, 2), TextColor, wkClr, 10);

   y += LH + 2;



   //=== Thin separator ===

   CreateBG("CG_sep2", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 8;



   //=== RSI + MA + DD Meter (compact row) ===

   double rsi = iRSI(Symbol(), 0, RSI_Period, RSI_Price, 1);

   double ma  = iMA(Symbol(), 0, MA_Period, MA_Shift, MA_Method, MA_Price, 1);

   color rsiClr = (rsi >= RSI_OB) ? SellColor : (rsi <= RSI_OS) ? BuyColor : DimColor;

   Lab("rsi_l", cx, y, "RSI:" + DoubleToStr(rsi, 1), rsiClr, 8);

   Lab("ma_v", cx + 75, y, "MA:" + DoubleToStr(ma, 2), (Close[0] > ma) ? BuyColor : SellColor, 8);



   //--- DD Meter (right side)

   double ddNetP2 = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   double slLim = BasketSL_Dollar;

   double absP  = MathAbs(ddNetP2);

   double ratio = (slLim > 0) ? absP / slLim : 0;

   color mClr = (ddNetP2 >= 0) ? BuyColor : (ratio < 0.5) ? C'255,220,80' : (ratio < 0.8) ? clrOrange : SellColor;

   LabR("ddm_v", vx, y, "DD:$" + DoubleToStr(absP, 1) + "/$" + DoubleToStr(slLim, 0), mClr, 8);

   y += LH;



   //=== Next Signal Prediction (live from bar 0) ===

   int peekSig = PeekNextSignal();

   double rsi0 = iRSI(Symbol(), 0, RSI_Period, RSI_Price, 0);

   string sigDir  = (peekSig == 1) ? ">> BUY" : (peekSig == -1) ? ">> SELL" : "-- WAIT";

   color  sigClr  = (peekSig == 1) ? C'50,200,255' : (peekSig == -1) ? C'255,120,80' : C'120,120,140';

   Lab("nextsig", cx, y, "Next: " + sigDir, sigClr, 9);

   LabR("nextrsi", vx, y, "RSI(0):" + DoubleToStr(rsi0, 1),

        (rsi0 >= RSI_OB) ? SellColor : (rsi0 <= RSI_OS) ? BuyColor : DimColor, 8);

   y += LH;



   //=== TP Counter ===

   string tpTargetStr = (TP_Mode == TP_DOLLAR) ? "$" + DoubleToStr(TP_Dollar, 1) : DoubleToStr(TP_Pips, 0) + "pip";

   Lab("tp_info", cx, y, "TP:" + IntegerToString(g_scalpTPDay) + "/" + IntegerToString(g_scalpTPCount) +

       " @" + tpTargetStr, C'150,210,150', 8);

   if(g_basketSLCount > 0)

      LabR("aw_info", vx, y, "AW:" + IntegerToString(g_awDayCount) + "/" + IntegerToString(g_basketSLCount), 

           C'255,200,120', 8);

   else

      LabR("aw_info", vx, y, "", clrNONE, 8);

   y += LH;



   //=== Next MG (pips remaining) ===

   int buyC  = CntOrd(OP_BUY);

   int sellC = CntOrd(OP_SELL);

   string nextMGText = "";

   color  nextMGClr  = DimColor;



   if(buyC > 0 && buyC < MaxTradesPerSide)

   {

      double pLeft = CalcMGPipsLeft(OP_BUY);

      double nextLot = CalcMGLot(OP_BUY);

      if(pLeft >= 0)

      {

         nextMGText = "Next MG: " + DoubleToStr(pLeft / g_pipDiv, 1) + " pips";

         double pipLeft = pLeft / g_pipDiv;

         nextMGClr  = (pipLeft <= 5) ? C'255,180,60' : (pipLeft <= 10) ? C'255,220,80' : C'180,180,200';

         LabR("mg_lot", vx, y, "#" + IntegerToString(buyC+1) + " " + DoubleToStr(nextLot, 2) + " lot",

              nextMGClr, 8);

      }

   }

   else if(sellC > 0 && sellC < MaxTradesPerSide)

   {

      double pLeft2 = CalcMGPipsLeft(OP_SELL);

      double nextLot2 = CalcMGLot(OP_SELL);

      if(pLeft2 >= 0)

      {

         nextMGText = "Next MG: " + DoubleToStr(pLeft2 / g_pipDiv, 1) + " pips";

         double pipLeft2 = pLeft2 / g_pipDiv;

         nextMGClr  = (pipLeft2 <= 5) ? C'255,180,60' : (pipLeft2 <= 10) ? C'255,220,80' : C'180,180,200';

         LabR("mg_lot", vx, y, "#" + IntegerToString(sellC+1) + " " + DoubleToStr(nextLot2, 2) + " lot",

              nextMGClr, 8);

      }

   }



   if(nextMGText != "")

   {

      Lab("mg_info", cx, y, nextMGText, nextMGClr, 8);

      y += LH;

   }

   else

   {

      Lab("mg_info", 0, 0, "", clrNONE, 1);

      LabR("mg_lot", 0, 0, "", clrNONE, 1);

   }



   //=== Thin separator ===

   CreateBG("CG_sep3", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 6;



   //=== สถานะ (Open Positions) ===

   Lab("pos_title", cx, y, "POSITIONS", C'180,180,200', 9);

   y += LH;



   if(totalOrders == 0)

   {

      Lab("pos0", cx + 4, y, "No open orders", C'100,100,120', 8);

      y += LH;

      // Clear old position labels

      for(int p = 1; p <= 5; p++)

      {

         Lab("pos" + IntegerToString(p), 0, 0, "", clrNONE, 1);

         LabR("posP" + IntegerToString(p), 0, 0, "", clrNONE, 1);

      }

   }

   else

   {

      int posIdx = 0;

      for(int i = OrdersTotal()-1; i >= 0 && posIdx < 5; i--)

      {

         if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;

         if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber) continue;

         if(OrderType() > OP_SELL) continue;



         string typeStr = (OrderType() == OP_BUY) ? "buy" : "sell";

         color  typeClr = (OrderType() == OP_BUY) ? C'100,200,255' : C'255,100,100';

         double ordPnL  = OrderProfit() + OrderSwap() + OrderCommission();

         color  pClr    = (ordPnL >= 0) ? C'100,230,100' : C'255,80,80';



         // "XAUUSD, sell 0.01"

         string ordLine = Symbol() + ", " + typeStr + " " + DoubleToStr(OrderLots(), 2);

         Lab("pos" + IntegerToString(posIdx), cx + 4, y, ordLine, typeClr, 8);

         LabR("posP" + IntegerToString(posIdx), vx, y, (ordPnL >= 0 ? "+" : "") + DoubleToStr(ordPnL, 2), pClr, 9);

         y += LH;

         posIdx++;

      }

      // Clear unused

      for(int p = posIdx; p <= 5; p++)

      {

         Lab("pos" + IntegerToString(p), 0, 0, "", clrNONE, 1);

         LabR("posP" + IntegerToString(p), 0, 0, "", clrNONE, 1);

      }

   }



   //=== AW Recovery Status ===

   if(g_eaMode != MODE_NORMAL)

   {

      y += 4;

      double awNet = AllOrdersPnL();

      string awText = "AW RECOVERY #" + IntegerToString(g_rcRound) +

                      "  Net:$" + DoubleToStr(awNet, 1);

      if(g_emergHedged) awText += " [HEDGED]";

      Lab("aw_bar", cx, y, awText, g_emergHedged ? clrRed : clrOrange, 9);

      y += LH + 2;

   }

   else

   {

      Lab("aw_bar", 0, 0, "", clrNONE, 1);

   }



   //=== Thin separator ===

   CreateBG("CG_sep4", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 6;



   //=== Session ===

   int hr = Hour();

   string sessName = "";

   color  sessClr  = DimColor;

   if(hr >= 13 && hr < 17)      { sessName = "LONDON / NEW YORK"; sessClr = clrGold; }

   else if(hr >= 10 && hr < 13) { sessName = "LONDON";            sessClr = BuyColor; }

   else if(hr >= 17 && hr < 21) { sessName = "NEW YORK";          sessClr = C'255,225,60'; }

   else if(hr >= 6 && hr < 10)  { sessName = "TOKYO";             sessClr = C'255,190,100'; }

   else if(hr >= 0 && hr < 6)   { sessName = "SYDNEY";            sessClr = C'100,180,255'; }

   else                          { sessName = "OFF HOURS";         sessClr = DimColor; }

   Lab("sess_v", cx, y, sessName, sessClr, 9);



   bool marketOpen2 = (DayOfWeek() > 0 && DayOfWeek() < 6);

   if(!marketOpen2 || (DayOfWeek() == 5 && Hour() >= 22))

      LabR("mkt_v", vx, y, "(Closed)", C'180,100,100', 8);

   else

      LabR("mkt_v", vx, y, "", clrNONE, 8);

   y += LH + 2;



   //=== News Section ===

   if(UseNewsFilter)

   {

      CreateBG("CG_sep5", px + 8, y, pw - 16, 1, C'50,50,70');

      y += 6;



      if(g_newsBlock)

      {

         Lab("news_h", cx, y, "NEWS BLOCKED", C'255,80,80', 9);

         LabR("news_st", vx, y, g_newsStatus, C'255,100,80', 8);

      }

      else if(g_upcomingCount > 0)

      {

         Lab("news_h", cx, y, "UPCOMING NEWS", C'180,180,200', 9);

         LabR("news_st", vx, y, "", clrNONE, 8);

      }

      else

      {

         Lab("news_h", cx, y, "NEWS: Clear", C'120,120,140', 8);

         LabR("news_st", vx, y, "", clrNONE, 8);

      }

      y += LH;



      for(int n = 0; n < 3; n++)

      {

         if(n < g_upcomingCount)

            Lab("news" + IntegerToString(n), cx + 4, y, g_upcomingNews[n], g_upcomingClr[n], 8);

         else

            Lab("news" + IntegerToString(n), cx + 4, y, "", clrNONE, 8);

         y += 15;

      }

      y += 4;

   }

   else

   {

      // Clear news labels

      Lab("news_h", 0, 0, "", clrNONE, 1);

      LabR("news_st", 0, 0, "", clrNONE, 1);

      for(int n = 0; n < 3; n++)

         Lab("news" + IntegerToString(n), 0, 0, "", clrNONE, 1);

      CreateBG("CG_sep5", 0, 0, 0, 0, PanelBG);

   }



   //=== Status Bar ===

   color stClr = GetStatusColor(status);

   Lab("status", cx, y, status, stClr, 11);

   y += LH + 4;



   //=== Buy / Sell Buttons ===

   int bCnt = CntOrd(OP_BUY);

   int sCnt = CntOrd(OP_SELL);

   color buyBtnClr  = (bCnt > 0) ? C'0,150,0' : C'30,60,30';

   color sellBtnClr = (sCnt > 0) ? C'180,50,30' : C'60,30,30';

   int btnW = (pw - 30) / 2;

   CreateBG("CG_buyBtn",  px + 8, y, btnW, 26, buyBtnClr);

   CreateBG("CG_sellBtn", px + 8 + btnW + 8, y, btnW, 26, sellBtnClr);

   Lab("buyBtn_t",  px + 8 + btnW/2 - 10, y + 5, "Buy", clrWhite, 10);

   Lab("sellBtn_t", px + 8 + btnW + 8 + btnW/2 - 12, y + 5, "Sell", clrWhite, 10);

   y += 32;



   //=== Last Action ===

   Lab("action", cx, y, g_lastAction, C'100,100,120', 7);



   //--- Resize panel to actual height

   int finalH = y - py + 16;

   CreateBG("CG_bg", px, py, pw, finalH, PanelBG);



   // Clear backtest-only labels

   Lab("wkp_l", 0, 0, "", clrNONE, 1);   Lab("wkp_v", 0, 0, "", clrNONE, 1);

   Lab("pkdd_l", 0, 0, "", clrNONE, 1);   Lab("pkdd_v", 0, 0, "", clrNONE, 1);

   Lab("mt4_l", 0, 0, "", clrNONE, 1);    Lab("mt4_v", 0, 0, "", clrNONE, 1);



   ChartRedraw(0);

}



//+------------------------------------------------------------------+
//| MINI Dashboard — สรุปสั้นสำหรับดูจาก Web                          |
//+------------------------------------------------------------------+
void DrawDashMini(string status, int px, int py)
{
   // Ultra-minimal: 3 labels + 1 panel = 4 objects total
   static bool miniCleaned = false;
   if(!miniCleaned) { ClearFullDashLabels(); miniCleaned = true; }

   int pw = 150;
   int panelH = 42;
   CreateBG("CG_bg", px, py, pw, panelH, PanelBG);
   CreateBG("CG_border", px, py, pw, 2, TitleColor);

   int total = CntOrd(OP_BUY) + CntOrd(OP_SELL);
   double netPnL = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   // Line 1: Label + status
   color stClr = GetStatusColor(status);
   Lab("title", px+6, py+4, AccountLabel, TitleColor, 9);
   LabR("mini_st", px+pw-6, py+4, status, stClr, 8);

   // Line 2: PnL + order count
   color pClr = (netPnL >= 0) ? C'100,230,100' : C'255,80,80';
   string pTxt = (netPnL >= 0 ? "+" : "") + DoubleToStr(netPnL, 2);
   string info = IntegerToString(total) + "ord";
   if(g_eaMode != MODE_NORMAL) info = info + " AW";
   if(IsNightMode()) info = info + " N";
   Lab("pnl_big", px+6, py+22, pTxt, pClr, 11);
   LabR("mini_ord", px+pw-6, py+24, info, C'150,150,170', 8);

   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//| Clear unused full-dashboard objects (called once)                 |
//+------------------------------------------------------------------+
void ClearFullDashLabels()
{
   // Delete all CG_ objects that mini mode doesn't use
   int total = ObjectsTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      string name = ObjectName(0, i);
      if(StringFind(name, "CG_") != 0) continue;
      // Keep only: CG_bg, CG_border, CG_title, CG_mini_st, CG_pnl_big, CG_mini_ord
      if(name == "CG_bg" || name == "CG_border" || name == "CG_title" ||
         name == "CG_mini_st" || name == "CG_pnl_big" || name == "CG_mini_ord") continue;
      ObjectDelete(0, name);
   }
}

//+------------------------------------------------------------------+

//| BACKTEST Dashboard                                                |

//+------------------------------------------------------------------+

void DrawDashBacktest(string status, int px, int py, int pw, int LH, int cx, int vx)

{

   int panelH = 480;

   CreateBG("CG_bg", px, py, pw, panelH, PanelBG);

   CreateBG("CG_border", px, py, pw, 2, TitleColor);



   int y = py + 10;



   //=== Title ===

   Lab("title", cx, y, "ClevrGold v1.0  [BACKTEST]", TitleColor, 10);

   y += 22;



   //=== Spread ===

   int sp = (int)MarketInfo(Symbol(), MODE_SPREAD);

   color spClr = (sp <= g_maxSpreadPts/2) ? C'100,230,100' :

                 (sp <= g_maxSpreadPts) ? C'255,220,80' : C'255,100,80';

   Lab("spread_l", cx, y, "Spread:", DimColor, 9);

   LabR("spread_v", vx, y, DoubleToStr(sp / g_pipDiv, 1) + " pips", spClr, 9);

   y += LH;



   CreateBG("CG_sep1b", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 8;



   //=== REAL Balance ===

   double realBal   = g_initDeposit + g_scalpProfit;

   double profitPct = (g_initDeposit > 0) ? g_scalpProfit / g_initDeposit * 100.0 : 0;

   string sign      = (g_scalpProfit >= 0) ? "+" : "";

   color  profClr   = (g_scalpProfit >= 0) ? clrLime : SellColor;



   Lab("netp_l", cx, y, "REAL Balance:", DimColor, 9);

   LabR("netp_v", vx, y, "$ " + DoubleToStr(realBal, 2), profClr, 11);

   y += LH + 4;



   //=== Scalp Profit ===

   Lab("dd_l", cx, y, "Scalp Profit:", DimColor, 9);

   LabR("dd_v", vx, y, sign + "$" + DoubleToStr(MathAbs(g_scalpProfit), 2) +

        " (" + sign + DoubleToStr(profitPct, 1) + "%)", profClr, 10);

   y += LH + 2;



   //=== Today TP ===

   color dayClr = (g_scalpProfitDay >= 0) ? BuyColor : SellColor;

   Lab("weekp_l", cx, y, "Today:", DimColor, 9);

   LabR("weekp_v", vx, y, (g_scalpProfitDay>=0?"+":"") + "$" +

        DoubleToStr(MathAbs(g_scalpProfitDay), 2) +

        " (" + IntegerToString(g_scalpTPDay) + " TP)", dayClr, 9);

   y += LH;



   //=== Week TP ===

   color wkClr = (g_scalpProfitWk >= 0) ? BuyColor : SellColor;

   Lab("wkp_l", cx, y, "Week:", DimColor, 9);

   LabR("wkp_v", vx, y, (g_scalpProfitWk>=0?"+":"") + "$" +

        DoubleToStr(MathAbs(g_scalpProfitWk), 2), wkClr, 9);

   y += LH + 4;



   CreateBG("CG_sep2b", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 8;



   //=== Stats ===

   Lab("bal_l", cx, y, "Total TP:", DimColor, 9);

   LabR("bal_v", vx, y, IntegerToString(g_scalpTPCount) + " rounds  Avg:$" +

        (g_scalpTPCount > 0 ? DoubleToStr(g_scalpProfit / g_scalpTPCount, 2) : "0"),

        C'150,210,150', 9);

   y += LH;



   Lab("eq_l", cx, y, "AW Recovery:", DimColor, 9);

   LabR("eq_v", vx, y, IntegerToString(g_basketSLCount) + " times ($0 each)",

        C'255,200,120', 9);

   y += LH;



   Lab("pkdd_l", cx, y, "Peak DD:", DimColor, 8);

   LabR("pkdd_v", vx, y, DoubleToStr(g_ddPeak, 1) + "%",

        g_ddPeak < 10 ? BuyColor : g_ddPeak < 25 ? C'255,220,80' : SellColor, 9);

   y += LH;



   double bal2 = AccountBalance();

   double eq2  = AccountEquity();

   Lab("mt4_l", cx, y, "MT4 Bal:", C'80,80,100', 7);

   LabR("mt4_v", vx, y, "$" + DoubleToStr(bal2, 0) + "  Eq:$" + DoubleToStr(eq2, 0),

        C'80,80,100', 7);

   y += LH + 4;



   CreateBG("CG_sep3b", px + 8, y, pw - 16, 1, C'50,50,70');

   y += 8;



   //=== Signal ===

   double rsi = iRSI(Symbol(), 0, RSI_Period, RSI_Price, 1);

   double ma  = iMA(Symbol(), 0, MA_Period, MA_Shift, MA_Method, MA_Price, 1);

   color rsiClr = (rsi >= RSI_OB) ? SellColor : (rsi <= RSI_OS) ? BuyColor : DimColor;

   Lab("rsi_l", cx, y, "RSI:" + DoubleToStr(rsi, 1), rsiClr, 8);

   Lab("ma_l", cx + 80, y, "MA:" + DoubleToStr(ma, 2), (Close[0] > ma) ? BuyColor : SellColor, 8);



   double ddNet = CalcPnL(OP_BUY) + CalcPnL(OP_SELL);

   double slLim = BasketSL_Dollar;

   double absP  = MathAbs(ddNet);

   double ratio2 = (slLim > 0) ? absP / slLim : 0;

   color mClr = (ddNet >= 0) ? BuyColor : (ratio2 < 0.5) ? C'255,220,80' : (ratio2 < 0.8) ? clrOrange : SellColor;

   LabR("ddm_v", vx, y, "DD:$" + DoubleToStr(absP, 1) + "/$" + DoubleToStr(slLim, 0), mClr, 8);

   y += LH;



   //=== Orders ===

   int bc = CntOrd(OP_BUY);

   int sc = CntOrd(OP_SELL);

   Lab("ord_l", cx, y, "B:" + IntegerToString(bc) + " S:" + IntegerToString(sc), TextColor, 8);

   y += LH + 4;



   //=== Status ===

   color stClr = GetStatusColor(status);

   Lab("status", cx, y, status, stClr, 11);

   y += LH + 2;

   Lab("action", cx, y, g_lastAction, DimColor, 7);



   // Clear live-only labels

   Lab("pnl_big", 0, 0, "", clrNONE, 1);

   Lab("mg_info", 0, 0, "", clrNONE, 1);

   LabR("mg_lot", 0, 0, "", clrNONE, 1);

   Lab("nextsig", 0, 0, "", clrNONE, 1);

   LabR("nextrsi", 0, 0, "", clrNONE, 1);

   for(int p = 0; p <= 5; p++)

   {

      Lab("pos" + IntegerToString(p), 0, 0, "", clrNONE, 1);

      LabR("posP" + IntegerToString(p), 0, 0, "", clrNONE, 1);

   }

   Lab("aw_bar", 0, 0, "", clrNONE, 1);

   Lab("news_h", 0, 0, "", clrNONE, 1);

   LabR("news_st", 0, 0, "", clrNONE, 1);

   for(int n = 0; n < 3; n++)

      Lab("news" + IntegerToString(n), 0, 0, "", clrNONE, 1);

   CreateBG("CG_buyBtn", 0, 0, 0, 0, PanelBG);

   CreateBG("CG_sellBtn", 0, 0, 0, 0, PanelBG);

   Lab("buyBtn_t", 0, 0, "", clrNONE, 1);

   Lab("sellBtn_t", 0, 0, "", clrNONE, 1);



   ChartRedraw(0);

}



//+------------------------------------------------------------------+

//| Status color helper                                               |

//+------------------------------------------------------------------+

color GetStatusColor(string status)

{

   if(status == "ACTIVE")                             return BuyColor;

   if(status == "WAITING")                            return C'255,220,80';

   if(status == "SKIP")                               return C'255,255,120';

   if(status == "NEWS STOP")                          return SellColor;

   if(status == "EMERGENCY")                          return clrRed;

   if(status == "WAIT AW" || status == "AW SIM")      return clrOrange;

   if(status == "FRI CLOSING" || status == "FRI STOP") return clrOrange;

   if(status == "MON WAIT")                            return C'100,180,255';

   return SellColor;

}



//+------------------------------------------------------------------+

//| Label with dotted line (Balance: ...... 3,697.47)                 |

//+------------------------------------------------------------------+

void LabDot(int lx, int rx, int y, string label, string value,

            color lblClr, color valClr, int sz)

{

   // Left label

   Lab("ld_" + label, lx, y, label, lblClr, sz);

   // Right value

   LabR("rv_" + label, rx, y, value, valClr, sz);

   // Dots in between (cosmetic)

   int dotX = lx + StringLen(label) * 7 + 10;

   int dotW = rx - dotX - StringLen(value) * 7;

   if(dotW > 20)

   {

      string dots = "";

      int numDots = dotW / 5;

      if(numDots > 30) numDots = 30;

      for(int i = 0; i < numDots; i++) dots += ".";

      Lab("dot_" + label, dotX, y + 2, dots, C'50,50,70', 7);

   }

}



//+------------------------------------------------------------------+

//| Dashboard helpers                                                 |

//+------------------------------------------------------------------+

void Lab(string id, int x, int y, string text, color clr, int sz)

{

   string name = "CG_" + id;

   if(ObjectFind(0, name) < 0)

   {

      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);

      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);

      ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);

      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");

      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);

   }

   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);

   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);

   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);

   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);

   ObjectSetString(0, name, OBJPROP_TEXT, text);

}



//--- Right-aligned label

void LabR(string id, int x, int y, string text, color clr, int sz)

{

   string name = "CG_" + id;

   if(ObjectFind(0, name) < 0)

   {

      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);

      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);

      ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_RIGHT_UPPER);

      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");

      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);

   }

   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);

   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);

   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);

   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);

   ObjectSetString(0, name, OBJPROP_TEXT, text);

}



void CreateBG(string name, int x, int y, int w, int h, color clr)

{

   if(ObjectFind(0, name) < 0)

   {

      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);

      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);

      ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);

      ObjectSetInteger(0, name, OBJPROP_BACK, false);

      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);

      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);

   }

   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);

   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);

   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);

   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);

   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, clr);

   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);

}

//+------------------------------------------------------------------+