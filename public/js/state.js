// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================

export const CURRENT_APP_VERSION = '2026.08.28-v3.4-balcao-fixed';

export const FALLBACK_USERS_LIST = [
    { id: "user-fernando", name: "Fernando", username: "fernando", role: "admin", avatar: "👑" },
    { id: "user-luana", name: "Luana", username: "luana", role: "seller", avatar: "🍫" }
];

export const state = {
    allProducts: [],
    allUsers: [],
    currentStoreSeller: 'all',
    currentFilter: 'all',
    searchQuery: '',
    cart: {},
    currentPixKey: '',
    pixCountdownInterval: null,
    pixStatusInterval: null,
    currentUser: JSON.parse(localStorage.getItem('trufas_current_user') || 'null'),
    adminToken: localStorage.getItem('trufas_admin_token') || '',
    allNotes: [],
    currentNotesFilter: 'all',
    notesSearchQuery: '',
    currentNotePaymentStatus: 'pending',
    selectedCartFriday: null,
    selectedCartDeliveryType: 'Entrega',
    currentDirectPaymentCondition: 'paid_now',
    knownOrderIdsSet: new Set(),
    isLiveOrderMonitorActive: false,
    lastOrderMonitorInterval: null,
    lastGeneratedAiProduct: null,
    currentStatsPeriod: 'all',
    allSchedules: [],
    currentSchedulesStatusFilter: 'all',
    currentSchedulesSellerFilter: 'all',
    currentSchedulesDateFilter: 'all',
    schedulesSearchQuery: '',
    currentScheduleDeliveryType: 'pickup',
    currentSchedulePaymentStatus: 'pending',
    currentScheduleSellerId: 'user-fernando',
    currentScheduleItemsMap: {},
    isProductionSummaryOpen: true,
    allIngredients: [],
    allRecipes: [],
    currentProductionShoppingData: null,
    clientBookingCart: {}
};
