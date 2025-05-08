import SQLite from 'react-native-sqlite-storage';

// Initialize SQLite database
const db = SQLite.openDatabase(
  {
    name: 'EventsDB',
    location: 'default',
  },
  () => console.log('Database opened'),
  (error) => console.error('Error opening database:', error)
);

// Create tables
db.transaction((tx) => {
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS SingleEvents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT
    )`,
    [],
    () => console.log('SingleEvents table created'),
    (_, error) => console.error('Error creating SingleEvents table:', error)
  );
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS RecurringEvents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      frequency TEXT,
      interval INTEGER,
      weekdays TEXT,
      monthDays TEXT,
      occurrences INTEGER,
      endCondition TEXT
    )`,
    [],
    () => console.log('RecurringEvents table created'),
    (_, error) => console.error('Error creating RecurringEvents table:', error)
  );
  tx.executeSql(
    `CREATE TABLE IF NOT EXISTS EventOccurrences (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT
    )`,
    [],
    () => console.log('EventOccurrences table created'),
    (_, error) => console.error('Error creating EventOccurrences table:', error)
  );
});

export const createEvent = async (eventData) => {
  try {
    const eventId = `event_${Math.random().toString(36).substr(2, 9)}`;
    const event = { ...eventData, eventId };

    await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        // Insert into SingleEvents or RecurringEvents
        if (event.type === 'single') {
          tx.executeSql(
            'INSERT INTO SingleEvents (id, title, date, description) VALUES (?, ?, ?, ?)',
            [eventId, event.title, event.startDate, event.description || null],
            () => console.log('Inserted single event into SingleEvents:', event),
            (_, error) => reject(new Error(`Failed to insert single event: ${error.message}`))
          );
          // Insert single occurrence
          const occurrenceId = `${eventId}_0`;
          tx.executeSql(
            'INSERT INTO EventOccurrences (id, eventId, title, date, description) VALUES (?, ?, ?, ?, ?)',
            [occurrenceId, eventId, event.title, event.startDate, event.description || null],
            () => console.log(`Inserted occurrence ${occurrenceId} for single event`),
            (_, error) => reject(new Error(`Failed to insert single event occurrence: ${error.message}`))
          );
        } else {
          tx.executeSql(
            'INSERT INTO RecurringEvents (id, title, startDate, endDate, frequency, interval, weekdays, monthDays, occurrences, endCondition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              eventId,
              event.title,
              event.startDate,
              event.endDate || null,
              event.frequency || null,
              event.interval || null,
              event.weekdays ? JSON.stringify(event.weekdays) : null,
              event.monthDays ? JSON.stringify(event.monthDays) : null,
              event.occurrences || null,
              event.endCondition || null,
            ],
            () => console.log('Inserted recurring event into RecurringEvents:', event),
            (_, error) => reject(new Error(`Failed to insert recurring event: ${error.message}`))
          );

          // Compute and insert occurrences
          const occurrences = calculateOccurrences(event);
          occurrences.forEach((date, index) => {
            const occurrenceId = `${eventId}_${index}`;
            tx.executeSql(
              'INSERT INTO EventOccurrences (id, eventId, title, date, description) VALUES (?, ?, ?, ?, ?)',
              [occurrenceId, eventId, event.title, date, event.description || null],
              () => console.log(`Inserted occurrence ${occurrenceId} for ${date}`),
              (_, error) => reject(new Error(`Failed to insert occurrence ${occurrenceId}: ${error.message}`))
            );
          });
        }
      }, reject, resolve);
    });

    return { eventId };
  } catch (error) {
    console.error('Failed to create event:', error);
    throw new Error('Could not save event');
  }
};

export const getOccurrencesByDate = async (selectedDate) => {
  console.log('Fetching occurrences for selected date:', selectedDate);
  try {
    const occurrences = await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM EventOccurrences WHERE date LIKE ? ORDER BY date',
          [`${selectedDate.split('T')[0]}%`],
          (_, { rows }) => {
            const results = [];
            for (let i = 0; i < rows.length; i++) {
              results.push(rows.item(i));
            }
            resolve(results);
          },
          (_, error) => reject(new Error(`Failed to fetch occurrences: ${error.message}`))
        );
      });
    });

    const formattedOccurrences = occurrences.map((occ) => ({
      id: occ.id,
      date: occ.date,
      title: occ.title,
      description: occ.description,
    }));
    console.log('Occurrences for date:', formattedOccurrences);
    return { occurrences: formattedOccurrences };
  } catch (error) {
    console.error('Error fetching occurrences by date:', error);
    throw new Error('Could not fetch occurrences');
  }
};

const calculateOccurrences = (event) => {
  console.log('Calculating occurrences for event:', event);
  const { startDate, endDate, frequency, interval, weekdays, monthDays, occurrences: maxOccurrences, endCondition } = event;
  const result = [];

  // Parse start date and normalize to midnight UTC
  const start = new Date(startDate);
  const utcYear = start.getUTCFullYear();
  const utcMonth = start.getUTCMonth();
  const utcDate = start.getUTCDate();
  const startDateOnly = new Date(Date.UTC(utcYear, utcMonth, utcDate));
  const end = endDate ? new Date(endDate) : null;
  const endDateOnly = end ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())) : null;
  console.log(`Raw startDate: ${startDate}, Parsed start: ${start.toISOString()}, Start date only: ${startDateOnly.toISOString()}, End date only: ${endDateOnly?.toISOString()}`);

  let parsedInterval = parseInt(interval) || 1;
  if (parsedInterval <= 0) {
    console.warn('Invalid interval, defaulting to 1');
    parsedInterval = 1;
  }

  if (frequency === 'weekly') {
    const selectedWeekdays = (weekdays || []).map((day) => day.toLowerCase());
    console.log('Weekly frequency, selected weekdays:', selectedWeekdays);
    let cycleCount = 0;
    let currentDate = new Date(startDateOnly);

    // If all weekdays are selected, treat as daily within the selected weeks
    const allWeekdaysSelected = selectedWeekdays.length === 7 &&
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        .every(day => selectedWeekdays.includes(day));

    if (allWeekdaysSelected && endCondition === 'date') {
      console.log('All weekdays selected, generating daily occurrences in selected weeks');
      while (currentDate <= endDateOnly) {
        const weekStart = new Date(currentDate);
        weekStart.setUTCHours(0, 0, 0, 0);
        console.log(`Processing week starting: ${weekStart.toISOString()}`);
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setUTCDate(weekStart.getUTCDate() + i);
          date.setUTCHours(0, 0, 0, 0);
          if (date >= startDateOnly && date <= endDateOnly) {
            result.push(date.toISOString());
            console.log(`Added daily occurrence: ${date.toISOString()}`);
          }
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 7 * parsedInterval);
      }
    } else {
      // Standard weekly recurrence
      const weekdayMap = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      };
      while (endCondition === 'date' ? currentDate <= endDateOnly : cycleCount < maxOccurrences) {
        const weekStart = new Date(currentDate);
        weekStart.setUTCHours(0, 0, 0, 0);
        console.log(`Processing week starting: ${weekStart.toISOString()}`);
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setUTCDate(weekStart.getUTCDate() + i);
          date.setUTCHours(0, 0, 0, 0);
          const dayIndex = date.getUTCDay();
          const dayName = weekdayMap[dayIndex];

          if (
            selectedWeekdays.includes(dayName) &&
            date >= startDateOnly &&
            (endCondition === 'date' ? date <= endDateOnly : true)
          ) {
            result.push(date.toISOString());
            console.log(`Added weekly occurrence: ${date.toISOString()}`);
          }
        }
        cycleCount++;
        currentDate.setUTCDate(currentDate.getUTCDate() + 7 * parsedInterval);
        if (endCondition === 'occurrences' && cycleCount >= maxOccurrences) break;
      }
    }
  } else if (frequency === 'monthly') {
    const days = (monthDays || []).map(Number).filter((day) => day >= 1 && day <= 31);
    console.log('Monthly frequency, selected days:', days);
    let cycleCount = 0;
    let currentDate = new Date(Date.UTC(utcYear, utcMonth, 1)); // Start from the first of the start month

    while (endCondition === 'date' ? currentDate <= endDateOnly : cycleCount < maxOccurrences) {
      const currentYear = currentDate.getUTCFullYear();
      const currentMonth = currentDate.getUTCMonth();
      for (const day of days) {
        const date = new Date(Date.UTC(currentYear, currentMonth, day));
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getUTCDate();
        if (day > daysInMonth) {
          console.log(`Skipping day ${day} (exceeds ${daysInMonth} days in month)`);
          continue;
        }
        console.log(`Checking date: ${date.toISOString()}, day: ${day}`);
        if (date >= startDateOnly && (endCondition === 'date' ? date <= endDateOnly : true)) {
          result.push(date.toISOString());
          console.log(`Added monthly occurrence: ${date.toISOString()}`);
        }
      }
      cycleCount++;
      currentDate.setUTCMonth(currentMonth + parsedInterval);
      if (endCondition === 'occurrences' && cycleCount >= maxOccurrences) break;
    }
  }

  console.log('Calculated occurrences:', result);
  return result;
};

export const debugDatabase = async () => {
  const singleEvents = await new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM SingleEvents', [], (_, { rows }) => {
        const events = [];
        for (let i = 0; i < rows.length; i++) events.push(rows.item(i));
        resolve(events);
      });
    });
  });
  const recurringEvents = await new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM RecurringEvents', [], (_, { rows }) => {
        const events = [];
        for (let i = 0; i < rows.length; i++) events.push(rows.item(i));
        resolve(events);
      });
    });
  });
  const eventOccurrences = await new Promise((resolve) => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM EventOccurrences', [], (_, { rows }) => {
        const events = [];
        for (let i = 0; i < rows.length; i++) events.push(rows.item(i));
        resolve(events);
      });
    });
  });
  console.log('SingleEvents:', singleEvents);
  console.log('RecurringEvents:', recurringEvents);
  console.log('EventOccurrences:', eventOccurrences);
  return { singleEvents, recurringEvents, eventOccurrences };
};