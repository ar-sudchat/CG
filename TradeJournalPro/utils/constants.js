import { Platform } from 'react-native';

// This URL should point to your backend server
// If running on local machine, use your computer's IP address (e.g., 192.168.1.XX)
// or ngrok tunnel URL if developing on real device.
// For emulator/simulator, '10.0.2.2' for Android emulator, 'localhost' for iOS simulator.
export const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001/api' : 'http://localhost:5001/api';

// Socket.io URL (same as backend but without /api)
export const SOCKET_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';

// Example translations (expanded in AppDataContext)
export const translations = {
  'th': {
    app_title: 'Trade Journal Pro', main_title: 'Trade Journal', main_subtitle: 'บันทึกเพื่อเติบโต', new_trade_button: 'บันทึกเทรดใหม่', menu_setups: 'กฎการเทรด', menu_history: 'ประวัติเทรด', menu_accounts: 'บัญชีเทรด',
    latest_trades: 'เทรดล่าสุด', select_language: 'เลือกภาษา', close: 'ปิด', items: 'รายการ', no_trades_yet: 'ยังไม่มีการบันทึกเทรด',
    create_account_first: 'โปรดสร้างบัญชีก่อนทำการบันทึกเทรด', create_setup_first: 'โปรดสร้าง Setup ก่อน',
    theme_dark: 'ธีมมืด', theme_light: 'ธีมสว่าง',
    // Auth
    login_subtitle: 'เข้าสู่ระบบเพื่อจัดการบันทึกการเทรด', login_button: 'เข้าสู่ระบบ', register_link: 'ยังไม่มีบัญชี? ลงทะเบียนที่นี่',
    register_subtitle: 'สร้างบัญชีเพื่อเริ่มต้นบันทึกการเทรด', register_button: 'ลงทะเบียน', login_link: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
    username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', confirm_password: 'ยืนยันรหัสผ่าน', email: 'อีเมล', email_placeholder: 'your@email.com',
    password_mismatch: 'รหัสผ่านไม่ตรงกัน', invalid_email: 'รูปแบบอีเมลไม่ถูกต้อง', logout: 'ออกจากระบบ',
    // New: Forex & SMC/ICT Analysis
    menu_live_prices: 'ราคาสด', menu_alerts: 'แจ้งเตือน', menu_analysis: 'วิเคราะห์', menu_ai_analysis: 'AI วิเคราะห์', menu_knowledge: 'คู่มือ SMC/ICT',
    connected: 'เชื่อมต่อแล้ว', disconnected: 'ขาดการเชื่อมต่อ',
    set_alert: 'ตั้งแจ้งเตือน', alert_type: 'ประเภทแจ้งเตือน', target_price: 'ราคาเป้าหมาย', current_price: 'ราคาปัจจุบัน',
    save_alert: 'บันทึกแจ้งเตือน', alert_saved: 'บันทึกแจ้งเตือนสำเร็จ',
    all: 'ทั้งหมด', active: 'ใช้งาน', triggered: 'ทำงานแล้ว', inactive: 'ปิด', add: 'เพิ่ม',
    no_alerts: 'ยังไม่มีแจ้งเตือน', confirm_delete: 'ยืนยันการลบ', confirm_delete_alert: 'ต้องการลบแจ้งเตือนนี้?',
    ai_analyze: 'AI วิเคราะห์ SMC/ICT', analyzing: 'กำลังวิเคราะห์', start_analysis: 'เริ่มวิเคราะห์', analyze_again: 'วิเคราะห์อีกครั้ง',
    ai_note: 'AI วิเคราะห์ตามหลัก SMC/ICT จากข้อมูลราคาและคู่มือที่อัพโหลด\nผลวิเคราะห์เป็นเพียงข้อเสนอแนะ ไม่ใช่คำแนะนำการลงทุน',
    category: 'หมวดหมู่', upload_document: 'อัพโหลดเอกสาร', uploading: 'กำลังอัพโหลด',
    document_uploaded: 'อัพโหลดเอกสารสำเร็จ', no_documents: 'ยังไม่มีเอกสาร', confirm_delete_document: 'ต้องการลบเอกสาร',
    highest_price: 'ราคาสูงสุด', lowest_price: 'ราคาต่ำสุด', avg_price: 'ราคาเฉลี่ย', volatility: 'ความผันผวน',
    trade_correlation: 'ความสัมพันธ์กับเทรด', total_trades: 'จำนวนเทรด', no_data: 'ไม่มีข้อมูล',
    no_accounts_yet: 'ยังไม่มีบัญชี', add_new_account: 'เพิ่มบัญชีใหม่', account_name: 'ชื่อบัญชี', initial_balance: 'ยอดเงินเริ่มต้น', e_g_main_account_placeholder: 'เช่น พอร์ตหลัก', save_account: 'บันทึกบัญชี', please_fill_all_fields: 'โปรดกรอกข้อมูลให้ครบถ้วน', account_saved_successfully: 'บันทึกบัญชีเรียบร้อยแล้ว', account_not_found: 'ไม่พบบัญชี', account_detail: 'รายละเอียดบัญชี', current_balance: 'ยอดเงินปัจจุบัน', delete: 'ลบ', confirm_delete_account: 'คุณแน่ใจหรือไม่ที่จะลบบัญชีนี้? การเทรดที่เกี่ยวข้องจะยังคงอยู่แต่ไม่แสดงชื่อบัญชี', account_deleted: 'บัญชีถูกลบแล้ว',
    no_setups_yet: 'ยังไม่มี Setup, กด "สร้าง Setup ใหม่" เพื่อเริ่มต้น', add_new_setup: 'สร้าง Setup ใหม่', setup_name: 'ชื่อ Setup', description: 'คำอธิบาย', e_g_breakout_strategy_placeholder: 'เช่น Breakout Strategy', e_g_trade_when_price_breaks_resistance_placeholder: 'ใช้เมื่อราคาทะลุแนวต้านสำคัญ...', technical_checklist: 'Checklist ทางเทคนิค', psychology_checklist: 'Checklist ด้านจิตวิทยา', add_condition: 'เพิ่มเงื่อนไข', save_setup: 'บันทึก Setup', setup_saved_successfully: 'บันทึก Setup เรียบร้อยแล้ว', setup_not_found: 'ไม่พบ Setup', setup_detail: 'รายละเอียด Setup', confirm_delete_setup: 'คุณแน่ใจหรือไม่ว่าต้องการลบ Setup นี้?', setup_deleted: 'Setup ถูกลบแล้ว',
    trade_conditions: 'เงื่อนไขการเทรด', not_checked_yet: 'ยังไม่ได้ตรวจสอบ', check: 'ตรวจสอบ', account: 'บัญชีเทรด', pair: 'คู่เงิน/หุ้น', e_g_eurusd_placeholder: 'EURUSD', direction: 'Buy / Sell', risk: 'ความเสี่ยง (Risk)', pnl: 'ผลกำไร/ขาดทุน (P/L)', trade_outcome: 'ผลลัพธ์ของเทรด', tp: 'Take Profit', sl: 'Stop Loss', be: 'Break Even', manual_close: 'Manual Close', entry_image: 'รูปภาพตอนเข้าเทรด (Entry)', select_entry_image: 'เลือกรูป Entry', exit_image: 'รูปภาพตอนปิดเทรด (Exit)', select_exit_image: 'เลือกรูป Exit', notes: 'บันทึกเพิ่มเติม', e_g_good_entry_placeholder: 'เหตุผลที่เข้าเทรด, อารมณ์, บทเรียน...', save_trade: 'บันทึกการเทรด', no_accounts_available: 'ไม่มีบัญชี', no_setups_available: 'ไม่มีกฎการเทรด', invalid_account_or_setup: 'บัญชีหรือกฎการเทรดไม่ถูกต้อง', trade_saved_successfully: 'บันทึกการเทรดสำเร็จ!', trade_not_found: 'ไม่พบเทรด', trade_detail: 'รายละเอียดเทรด', delete_trade: 'ลบเทรด', confirm_delete_trade: 'คุณแน่ใจหรือไม่ที่จะลบรายการเทรดนี้?', trade_deleted: 'รายการเทรดถูกลบแล้ว', select_setup: 'เลือก Setup', select_setup_description: 'เลือกกฎการเทรดที่คุณจะใช้สำหรับเทรดนี้', check_conditions: 'ตรวจสอบเงื่อนไข', confirm_conditions: 'ยืนยันเงื่อนไข',
    checked: 'ตรวจสอบแล้ว', no_description: 'ไม่มีคำอธิบาย', conditions: 'เงื่อนไข', edit_account: 'แก้ไขบัญชี', account_balance: 'ยอดเงินคงเหลือ', net_pnl: 'กำไร/ขาดทุนสุทธิ', win_rate: 'อัตราการชนะ', avg_pnl: 'กำไร/ขาดทุนเฉลี่ย', pnl_over_time: 'P&L เมื่อเวลาผ่านไป', trade_history: 'ประวัติเทรด', no_trades_in_account: 'ไม่มีเทรดในบัญชีนี้', no_image: 'ไม่มีรูปภาพ', no_additional_notes: 'ไม่มีบันทึกเพิ่มเติม', edit_setup: 'แก้ไข Setup', condition_placeholder: 'เงื่อนไข...',
  },
  'en': {
    app_title: 'Trade Journal Pro', main_title: 'Trade Journal', main_subtitle: 'Log to Grow', new_trade_button: 'New Trade Log', menu_setups: 'Setups', menu_history: 'History', menu_accounts: 'Accounts',
    latest_trades: 'Latest Trades', select_language: 'Select Language', close: 'Close', items: 'items', no_trades_yet: 'No trades recorded yet',
    create_account_first: 'Please create an account before logging a trade', create_setup_first: 'Please create a setup first',
    theme_dark: 'Dark Theme', theme_light: 'Light Theme',
    // Auth
    login_subtitle: 'Sign in to manage your trading journal', login_button: 'Sign In', register_link: "Don't have an account? Register here",
    register_subtitle: 'Create an account to start logging trades', register_button: 'Register', login_link: 'Already have an account? Sign in',
    username: 'Username', password: 'Password', confirm_password: 'Confirm Password', email: 'Email', email_placeholder: 'your@email.com',
    password_mismatch: 'Passwords do not match', invalid_email: 'Invalid email format', logout: 'Logout',
    // New: Forex & SMC/ICT Analysis
    menu_live_prices: 'Live Prices', menu_alerts: 'Alerts', menu_analysis: 'Analysis', menu_ai_analysis: 'AI Analysis', menu_knowledge: 'SMC/ICT Guide',
    connected: 'Connected', disconnected: 'Disconnected',
    set_alert: 'Set Alert', alert_type: 'Alert Type', target_price: 'Target Price', current_price: 'Current Price',
    save_alert: 'Save Alert', alert_saved: 'Alert saved successfully',
    all: 'All', active: 'Active', triggered: 'Triggered', inactive: 'Inactive', add: 'Add',
    no_alerts: 'No alerts yet', confirm_delete: 'Confirm Delete', confirm_delete_alert: 'Delete this alert?',
    ai_analyze: 'AI Analyze SMC/ICT', analyzing: 'Analyzing', start_analysis: 'Start Analysis', analyze_again: 'Analyze Again',
    ai_note: 'AI analyzes based on SMC/ICT concepts from price data and uploaded guides.\nResults are suggestions only, not investment advice.',
    category: 'Category', upload_document: 'Upload Document', uploading: 'Uploading',
    document_uploaded: 'Document uploaded successfully', no_documents: 'No documents yet', confirm_delete_document: 'Delete this document',
    highest_price: 'Highest', lowest_price: 'Lowest', avg_price: 'Average', volatility: 'Volatility',
    trade_correlation: 'Trade Correlation', total_trades: 'Total Trades', no_data: 'No data',
    no_accounts_yet: 'No accounts yet, click "Create New Account" to start', add_new_account: 'Create New Account', account_name: 'Account Name', initial_balance: 'Initial Balance', e_g_main_account_placeholder: 'e.g., Main Account', save_account: 'Save Account', please_fill_all_fields: 'Please fill all fields', account_saved_successfully: 'Account saved successfully', account_not_found: 'Account not found', account_detail: 'Account Detail', current_balance: 'Current Balance', delete: 'Delete', confirm_delete_account: 'Are you sure you want to delete this account? Associated trades will remain but without account name.', account_deleted: 'Account deleted',
    no_setups_yet: 'No Setups yet, click "Create New Setup" to start', add_new_setup: 'Create New Setup', setup_name: 'Setup Name', description: 'Description', e_g_breakout_strategy_placeholder: 'e.g., Breakout Strategy', e_g_trade_when_price_breaks_resistance_placeholder: 'e.g., Use when price breaks significant resistance...', technical_checklist: 'Technical Checklist', psychology_checklist: 'Psychology Checklist', add_condition: 'Add Condition', save_setup: 'Save Setup', setup_saved_successfully: 'Setup saved successfully', setup_not_found: 'Setup not found', setup_detail: 'Setup Detail', confirm_delete_setup: 'Are you sure you want to delete this setup?', setup_deleted: 'Setup deleted',
    trade_conditions: 'Trade Conditions', not_checked_yet: 'Not Checked Yet', check: 'Check', account: 'Trade Account', pair: 'Pair', e_g_eurusd_placeholder: 'EURUSD', direction: 'Buy / Sell', risk: 'Risk', pnl: 'Profit/Loss', trade_outcome: 'Trade Outcome', tp: 'Take Profit', sl: 'Stop Loss', be: 'Break Even', manual_close: 'Manual Close', entry_image: 'Entry Image', select_entry_image: 'Select Entry Image', exit_image: 'Exit Image', select_exit_image: 'Select Exit Image', notes: 'Additional Notes', e_g_good_entry_placeholder: 'e.g., Reason for entry, emotions, lessons learned...', save_trade: 'Save Trade', no_accounts_available: 'No accounts available', no_setups_available: 'No setups available', invalid_account_or_setup: 'Invalid account or setup', trade_saved_successfully: 'Trade saved successfully!', trade_not_found: 'Trade not found', trade_detail: 'Trade Detail', delete_trade: 'Delete Trade', confirm_delete_trade: 'Are you sure you want to delete this trade entry?', trade_deleted: 'Trade entry deleted', select_setup: 'Select Setup', select_setup_description: 'Select the trading setup you will use for this trade.', check_conditions: 'Check Conditions', confirm_conditions: 'Confirm Conditions',
    checked: 'Checked', no_description: 'No description', conditions: 'Conditions', edit_account: 'Edit Account', account_balance: 'Account Balance', net_pnl: 'Net P&L', win_rate: 'Win Rate', avg_pnl: 'Avg. Profit/Loss', pnl_over_time: 'P&L Over Time', trade_history: 'Trade History', no_trades_in_account: 'No trades in this account', no_image: 'No image', no_additional_notes: 'No additional notes', edit_setup: 'Edit Setup', condition_placeholder: 'Condition...',
  },
};