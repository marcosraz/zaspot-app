/**
 * ZAspot App Translations
 * Matching the web app translations from data/appInfo.ts
 * Languages: Czech (cz), English (en), German (de), Polish (pl)
 */

export type Language = 'cz' | 'en' | 'de' | 'pl';

export interface Translations {
  // Tab navigation
  tabs: {
    home: string;
    map: string;
    spotPrices: string;
    route: string;
    profile: string;
  };

  // Home screen
  home: {
    welcome: string;
    currentPrice: string;
    priceNow: string;
    perKwh: string;
    nearbyStations: string;
    viewAll: string;
    quickActions: string;
    findStation: string;
    planRoute: string;
    myReservations: string;
    spotPrices: string;
  };

  // Map screen
  map: {
    title: string;
    searchPlaceholder: string;
    filters: string;
    allStations: string;
    available: string;
    dcOnly: string;
    acOnly: string;
    minPower: string;
    stationDetails: string;
    connectors: string;
    power: string;
    price: string;
    status: string;
    available_status: string;
    occupied: string;
    offline: string;
    navigate: string;
    reserve: string;
    distance: string;
    favoritesOnly: string;
    freeParking: string;
    connectorType: string;
    resetFilters: string;
    allTypes: string;
  };

  // Spot prices screen
  spotPrices: {
    title: string;
    subtitle: string;
    today: string;
    week: string;
    month: string;
    average: string;
    current: string;
    lowest: string;
    highest: string;
    bestTime: string;
    priceAlert: string;
    setAlert: string;
    currency: string;
    perMwh: string;
    perKwh: string;
    lastUpdated: string;
    trend: string;
    rising: string;
    falling: string;
    stable: string;
    hourlyPrices: string;
    chargeNow: string;
    waitForBetter: string;
    savingPotential: string;
  };

  // Route planner
  route: {
    title: string;
    subtitle: string;
    from: string;
    to: string;
    currentLocation: string;
    calculateRoute: string;
    distance: string;
    duration: string;
    estimatedCost: string;
    chargingStops: string;
    addStop: string;
    noStationsFound: string;
    calculating: string;
    batteryLevel: string;
    vehicleRange: string;
  };

  // Profile screen
  profile: {
    title: string;
    settings: string;
    language: string;
    theme: string;
    notifications: string;
    priceAlerts: string;
    reservations: string;
    history: string;
    about: string;
    help: string;
    contact: string;
    version: string;
    logout: string;
    darkMode: string;
    lightMode: string;
    systemDefault: string;
  };

  // Reservations
  reservations: {
    title: string;
    upcoming: string;
    past: string;
    noReservations: string;
    createNew: string;
    cancel: string;
    confirm: string;
    selectDate: string;
    selectTime: string;
    duration: string;
    totalCost: string;
    status: string;
    pending: string;
    confirmed: string;
    cancelled: string;
    completed: string;
  };

  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    close: string;
    back: string;
    next: string;
    done: string;
    search: string;
    noResults: string;
    km: string;
    min: string;
    hour: string;
    kw: string;
    kwh: string;
  };

  // Company info
  company: {
    name: string;
    phone: string;
    email: string;
    website: string;
  };
}

export const translations: Record<Language, Translations> = {
  cz: {
    tabs: {
      home: 'Domů',
      map: 'Mapa',
      spotPrices: 'Ceny',
      route: 'Trasa',
      profile: 'Profil',
    },
    home: {
      welcome: 'Vítejte v ZAspot',
      currentPrice: 'Aktuální cena',
      priceNow: 'Cena teď',
      perKwh: 'Kč/kWh',
      nearbyStations: 'Stanice v okolí',
      viewAll: 'Zobrazit vše',
      quickActions: 'Rychlé akce',
      findStation: 'Najít stanici',
      planRoute: 'Plánovat cestu',
      myReservations: 'Moje rezervace',
      spotPrices: 'Spotové ceny',
    },
    map: {
      title: 'Mapa stanic',
      searchPlaceholder: 'Hledat stanici...',
      filters: 'Filtry',
      allStations: 'Všechny stanice',
      available: 'Dostupné',
      dcOnly: 'Pouze DC',
      acOnly: 'Pouze AC',
      minPower: 'Min. výkon',
      stationDetails: 'Detail stanice',
      connectors: 'Konektory',
      power: 'Výkon',
      price: 'Cena',
      status: 'Stav',
      available_status: 'Dostupná',
      occupied: 'Obsazená',
      offline: 'Offline',
      navigate: 'Navigovat',
      reserve: 'Rezervovat',
      distance: 'Vzdálenost',
      favoritesOnly: 'Pouze oblíbené',
      freeParking: 'Parkování zdarma',
      connectorType: 'Typ konektoru',
      resetFilters: 'Resetovat filtry',
      allTypes: 'Vše',
    },
    spotPrices: {
      title: 'Spotové ceny elektřiny',
      subtitle: 'Aktuální ceny na burze',
      today: 'Dnes',
      week: 'Týden',
      month: 'Měsíc',
      average: 'Průměr',
      current: 'Aktuální',
      lowest: 'Nejnižší',
      highest: 'Nejvyšší',
      bestTime: 'Nejlepší čas k nabíjení',
      priceAlert: 'Cenový alert',
      setAlert: 'Nastavit upozornění',
      currency: 'CZK',
      perMwh: 'Kč/MWh',
      perKwh: 'Kč/kWh',
      lastUpdated: 'Poslední aktualizace',
      trend: 'Trend',
      rising: 'Stoupá',
      falling: 'Klesá',
      stable: 'Stabilní',
      hourlyPrices: 'Hodinové ceny',
      chargeNow: 'Nabíjejte nyní!',
      waitForBetter: 'Počkejte na lepší cenu',
      savingPotential: 'Potenciál úspory',
    },
    route: {
      title: 'Plánovat cestu',
      subtitle: 'Najděte optimální trasu s nabíjecími stanicemi',
      from: 'Odkud',
      to: 'Kam',
      currentLocation: 'Aktuální poloha',
      calculateRoute: 'Vypočítat trasu',
      distance: 'Vzdálenost',
      duration: 'Doba jízdy',
      estimatedCost: 'Odhadované náklady',
      chargingStops: 'Nabíjecí zastávky',
      addStop: 'Přidat zastávku',
      noStationsFound: 'Žádné stanice na trase',
      calculating: 'Vypočítávám...',
      batteryLevel: 'Stav baterie',
      vehicleRange: 'Dojezd vozidla',
    },
    profile: {
      title: 'Profil',
      settings: 'Nastavení',
      language: 'Jazyk',
      theme: 'Vzhled',
      notifications: 'Oznámení',
      priceAlerts: 'Cenové alerty',
      reservations: 'Moje rezervace',
      history: 'Historie nabíjení',
      about: 'O aplikaci',
      help: 'Nápověda',
      contact: 'Kontakt',
      version: 'Verze',
      logout: 'Odhlásit se',
      darkMode: 'Tmavý režim',
      lightMode: 'Světlý režim',
      systemDefault: 'Podle systému',
    },
    reservations: {
      title: 'Rezervace',
      upcoming: 'Nadcházející',
      past: 'Minulé',
      noReservations: 'Žádné rezervace',
      createNew: 'Vytvořit novou',
      cancel: 'Zrušit',
      confirm: 'Potvrdit',
      selectDate: 'Vyberte datum',
      selectTime: 'Vyberte čas',
      duration: 'Doba trvání',
      totalCost: 'Celková cena',
      status: 'Stav',
      pending: 'Čeká na potvrzení',
      confirmed: 'Potvrzeno',
      cancelled: 'Zrušeno',
      completed: 'Dokončeno',
    },
    common: {
      loading: 'Načítání...',
      error: 'Chyba',
      retry: 'Zkusit znovu',
      cancel: 'Zrušit',
      save: 'Uložit',
      close: 'Zavřít',
      back: 'Zpět',
      next: 'Další',
      done: 'Hotovo',
      search: 'Hledat',
      noResults: 'Žádné výsledky',
      km: 'km',
      min: 'min',
      hour: 'hod',
      kw: 'kW',
      kwh: 'kWh',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  en: {
    tabs: {
      home: 'Home',
      map: 'Map',
      spotPrices: 'Prices',
      route: 'Route',
      profile: 'Profile',
    },
    home: {
      welcome: 'Welcome to ZAspot',
      currentPrice: 'Current Price',
      priceNow: 'Price Now',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Nearby Stations',
      viewAll: 'View All',
      quickActions: 'Quick Actions',
      findStation: 'Find Station',
      planRoute: 'Plan Route',
      myReservations: 'My Reservations',
      spotPrices: 'Spot Prices',
    },
    map: {
      title: 'Charging Map',
      searchPlaceholder: 'Search station...',
      filters: 'Filters',
      allStations: 'All Stations',
      available: 'Available',
      dcOnly: 'DC Only',
      acOnly: 'AC Only',
      minPower: 'Min. Power',
      stationDetails: 'Station Details',
      connectors: 'Connectors',
      power: 'Power',
      price: 'Price',
      status: 'Status',
      available_status: 'Available',
      occupied: 'Occupied',
      offline: 'Offline',
      navigate: 'Navigate',
      reserve: 'Reserve',
      distance: 'Distance',
      favoritesOnly: 'Favorites only',
      freeParking: 'Free parking',
      connectorType: 'Connector type',
      resetFilters: 'Reset filters',
      allTypes: 'All',
    },
    spotPrices: {
      title: 'Electricity Spot Prices',
      subtitle: 'Current market prices',
      today: 'Today',
      week: 'Week',
      month: 'Month',
      average: 'Average',
      current: 'Current',
      lowest: 'Lowest',
      highest: 'Highest',
      bestTime: 'Best Time to Charge',
      priceAlert: 'Price Alert',
      setAlert: 'Set Alert',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Last Updated',
      trend: 'Trend',
      rising: 'Rising',
      falling: 'Falling',
      stable: 'Stable',
      hourlyPrices: 'Hourly prices',
      chargeNow: 'Charge now!',
      waitForBetter: 'Wait for a better price',
      savingPotential: 'Saving potential',
    },
    route: {
      title: 'Plan Route',
      subtitle: 'Find optimal route with charging stations',
      from: 'From',
      to: 'To',
      currentLocation: 'Current Location',
      calculateRoute: 'Calculate Route',
      distance: 'Distance',
      duration: 'Duration',
      estimatedCost: 'Estimated Cost',
      chargingStops: 'Charging Stops',
      addStop: 'Add Stop',
      noStationsFound: 'No stations on route',
      calculating: 'Calculating...',
      batteryLevel: 'Battery Level',
      vehicleRange: 'Vehicle Range',
    },
    profile: {
      title: 'Profile',
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      priceAlerts: 'Price Alerts',
      reservations: 'My Reservations',
      history: 'Charging History',
      about: 'About App',
      help: 'Help',
      contact: 'Contact',
      version: 'Version',
      logout: 'Log Out',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      systemDefault: 'System Default',
    },
    reservations: {
      title: 'Reservations',
      upcoming: 'Upcoming',
      past: 'Past',
      noReservations: 'No reservations',
      createNew: 'Create New',
      cancel: 'Cancel',
      confirm: 'Confirm',
      selectDate: 'Select Date',
      selectTime: 'Select Time',
      duration: 'Duration',
      totalCost: 'Total Cost',
      status: 'Status',
      pending: 'Pending',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      completed: 'Completed',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      noResults: 'No results',
      km: 'km',
      min: 'min',
      hour: 'hr',
      kw: 'kW',
      kwh: 'kWh',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  de: {
    tabs: {
      home: 'Start',
      map: 'Karte',
      spotPrices: 'Preise',
      route: 'Route',
      profile: 'Profil',
    },
    home: {
      welcome: 'Willkommen bei ZAspot',
      currentPrice: 'Aktueller Preis',
      priceNow: 'Preis jetzt',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Stationen in der Nähe',
      viewAll: 'Alle anzeigen',
      quickActions: 'Schnellaktionen',
      findStation: 'Station finden',
      planRoute: 'Route planen',
      myReservations: 'Meine Reservierungen',
      spotPrices: 'Spotpreise',
    },
    map: {
      title: 'Ladekarte',
      searchPlaceholder: 'Station suchen...',
      filters: 'Filter',
      allStations: 'Alle Stationen',
      available: 'Verfügbar',
      dcOnly: 'Nur DC',
      acOnly: 'Nur AC',
      minPower: 'Min. Leistung',
      stationDetails: 'Stationsdetails',
      connectors: 'Anschlüsse',
      power: 'Leistung',
      price: 'Preis',
      status: 'Status',
      available_status: 'Verfügbar',
      occupied: 'Belegt',
      offline: 'Offline',
      navigate: 'Navigieren',
      reserve: 'Reservieren',
      distance: 'Entfernung',
      favoritesOnly: 'Nur Favoriten',
      freeParking: 'Kostenloses Parken',
      connectorType: 'Anschlusstyp',
      resetFilters: 'Filter zurücksetzen',
      allTypes: 'Alle',
    },
    spotPrices: {
      title: 'Stromspotpreise',
      subtitle: 'Aktuelle Marktpreise',
      today: 'Heute',
      week: 'Woche',
      month: 'Monat',
      average: 'Durchschnitt',
      current: 'Aktuell',
      lowest: 'Niedrigster',
      highest: 'Höchster',
      bestTime: 'Beste Ladezeit',
      priceAlert: 'Preisalarm',
      setAlert: 'Alarm setzen',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Letzte Aktualisierung',
      trend: 'Trend',
      rising: 'Steigend',
      falling: 'Fallend',
      stable: 'Stabil',
      hourlyPrices: 'Stündliche Preise',
      chargeNow: 'Jetzt laden!',
      waitForBetter: 'Auf besseren Preis warten',
      savingPotential: 'Sparpotenzial',
    },
    route: {
      title: 'Route planen',
      subtitle: 'Optimale Route mit Ladestationen finden',
      from: 'Von',
      to: 'Nach',
      currentLocation: 'Aktueller Standort',
      calculateRoute: 'Route berechnen',
      distance: 'Entfernung',
      duration: 'Fahrzeit',
      estimatedCost: 'Geschätzte Kosten',
      chargingStops: 'Ladestopps',
      addStop: 'Stopp hinzufügen',
      noStationsFound: 'Keine Stationen auf der Route',
      calculating: 'Berechne...',
      batteryLevel: 'Akkustand',
      vehicleRange: 'Reichweite',
    },
    profile: {
      title: 'Profil',
      settings: 'Einstellungen',
      language: 'Sprache',
      theme: 'Design',
      notifications: 'Benachrichtigungen',
      priceAlerts: 'Preisalarme',
      reservations: 'Meine Reservierungen',
      history: 'Ladehistorie',
      about: 'Über die App',
      help: 'Hilfe',
      contact: 'Kontakt',
      version: 'Version',
      logout: 'Abmelden',
      darkMode: 'Dunkler Modus',
      lightMode: 'Heller Modus',
      systemDefault: 'Systemstandard',
    },
    reservations: {
      title: 'Reservierungen',
      upcoming: 'Kommende',
      past: 'Vergangene',
      noReservations: 'Keine Reservierungen',
      createNew: 'Neu erstellen',
      cancel: 'Stornieren',
      confirm: 'Bestätigen',
      selectDate: 'Datum wählen',
      selectTime: 'Zeit wählen',
      duration: 'Dauer',
      totalCost: 'Gesamtkosten',
      status: 'Status',
      pending: 'Ausstehend',
      confirmed: 'Bestätigt',
      cancelled: 'Storniert',
      completed: 'Abgeschlossen',
    },
    common: {
      loading: 'Lädt...',
      error: 'Fehler',
      retry: 'Erneut versuchen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      close: 'Schließen',
      back: 'Zurück',
      next: 'Weiter',
      done: 'Fertig',
      search: 'Suchen',
      noResults: 'Keine Ergebnisse',
      km: 'km',
      min: 'Min',
      hour: 'Std',
      kw: 'kW',
      kwh: 'kWh',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },

  pl: {
    tabs: {
      home: 'Start',
      map: 'Mapa',
      spotPrices: 'Ceny',
      route: 'Trasa',
      profile: 'Profil',
    },
    home: {
      welcome: 'Witamy w ZAspot',
      currentPrice: 'Aktualna cena',
      priceNow: 'Cena teraz',
      perKwh: 'CZK/kWh',
      nearbyStations: 'Stacje w pobliżu',
      viewAll: 'Zobacz wszystkie',
      quickActions: 'Szybkie akcje',
      findStation: 'Znajdź stację',
      planRoute: 'Zaplanuj trasę',
      myReservations: 'Moje rezerwacje',
      spotPrices: 'Ceny spot',
    },
    map: {
      title: 'Mapa stacji',
      searchPlaceholder: 'Szukaj stacji...',
      filters: 'Filtry',
      allStations: 'Wszystkie stacje',
      available: 'Dostępne',
      dcOnly: 'Tylko DC',
      acOnly: 'Tylko AC',
      minPower: 'Min. moc',
      stationDetails: 'Szczegóły stacji',
      connectors: 'Złącza',
      power: 'Moc',
      price: 'Cena',
      status: 'Status',
      available_status: 'Dostępna',
      occupied: 'Zajęta',
      offline: 'Offline',
      navigate: 'Nawiguj',
      reserve: 'Zarezerwuj',
      distance: 'Odległość',
      favoritesOnly: 'Tylko ulubione',
      freeParking: 'Darmowy parking',
      connectorType: 'Typ złącza',
      resetFilters: 'Resetuj filtry',
      allTypes: 'Wszystko',
    },
    spotPrices: {
      title: 'Ceny spot energii',
      subtitle: 'Aktualne ceny rynkowe',
      today: 'Dziś',
      week: 'Tydzień',
      month: 'Miesiąc',
      average: 'Średnia',
      current: 'Aktualna',
      lowest: 'Najniższa',
      highest: 'Najwyższa',
      bestTime: 'Najlepszy czas ładowania',
      priceAlert: 'Alert cenowy',
      setAlert: 'Ustaw alert',
      currency: 'CZK',
      perMwh: 'CZK/MWh',
      perKwh: 'CZK/kWh',
      lastUpdated: 'Ostatnia aktualizacja',
      trend: 'Trend',
      rising: 'Rośnie',
      falling: 'Spada',
      stable: 'Stabilny',
      hourlyPrices: 'Ceny godzinowe',
      chargeNow: 'Ładuj teraz!',
      waitForBetter: 'Poczekaj na lepszą cenę',
      savingPotential: 'Potencjał oszczędności',
    },
    route: {
      title: 'Zaplanuj trasę',
      subtitle: 'Znajdź optymalną trasę ze stacjami ładowania',
      from: 'Z',
      to: 'Do',
      currentLocation: 'Bieżąca lokalizacja',
      calculateRoute: 'Oblicz trasę',
      distance: 'Odległość',
      duration: 'Czas jazdy',
      estimatedCost: 'Szacunkowy koszt',
      chargingStops: 'Przystanki ładowania',
      addStop: 'Dodaj przystanek',
      noStationsFound: 'Brak stacji na trasie',
      calculating: 'Obliczanie...',
      batteryLevel: 'Poziom baterii',
      vehicleRange: 'Zasięg pojazdu',
    },
    profile: {
      title: 'Profil',
      settings: 'Ustawienia',
      language: 'Język',
      theme: 'Motyw',
      notifications: 'Powiadomienia',
      priceAlerts: 'Alerty cenowe',
      reservations: 'Moje rezerwacje',
      history: 'Historia ładowania',
      about: 'O aplikacji',
      help: 'Pomoc',
      contact: 'Kontakt',
      version: 'Wersja',
      logout: 'Wyloguj',
      darkMode: 'Tryb ciemny',
      lightMode: 'Tryb jasny',
      systemDefault: 'Domyślny systemu',
    },
    reservations: {
      title: 'Rezerwacje',
      upcoming: 'Nadchodzące',
      past: 'Przeszłe',
      noReservations: 'Brak rezerwacji',
      createNew: 'Utwórz nową',
      cancel: 'Anuluj',
      confirm: 'Potwierdź',
      selectDate: 'Wybierz datę',
      selectTime: 'Wybierz czas',
      duration: 'Czas trwania',
      totalCost: 'Całkowity koszt',
      status: 'Status',
      pending: 'Oczekujące',
      confirmed: 'Potwierdzone',
      cancelled: 'Anulowane',
      completed: 'Zakończone',
    },
    common: {
      loading: 'Ładowanie...',
      error: 'Błąd',
      retry: 'Spróbuj ponownie',
      cancel: 'Anuluj',
      save: 'Zapisz',
      close: 'Zamknij',
      back: 'Wstecz',
      next: 'Dalej',
      done: 'Gotowe',
      search: 'Szukaj',
      noResults: 'Brak wyników',
      km: 'km',
      min: 'min',
      hour: 'godz',
      kw: 'kW',
      kwh: 'kWh',
    },
    company: {
      name: 'sdil s.r.o.',
      phone: '+420 770 103 103',
      email: 'sdil@sdil.cz',
      website: 'www.zaspot.cz',
    },
  },
};

export const getTranslation = (language: Language): Translations => {
  return translations[language];
};

export const defaultLanguage: Language = 'cz';
