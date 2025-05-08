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

export const getEventOccurrences = async (eventId) => {
  try {
    const occurrences = await new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM EventOccurrences WHERE eventId = ? ORDER BY date',
          [eventId],
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
    console.log('Event occurrences fetched:', formattedOccurrences);
    return { occurrences: formattedOccurrences };
  } catch (error) {
    console.error('Error fetching event occurrences:', error);
    throw new Error('Could not fetch event occurrences');
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

  // Parse start and end dates
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  // Normalize to midnight UTC for date-only comparison
  const startDateOnly = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDateOnly = end ? new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) : null;
  console.log(`Start date only: ${startDateOnly.toISOString()}, End date only: ${endDateOnly?.toISOString()}`);

  let parsedInterval = parseInt(interval) || 1;
  if (parsedInterval <= 0) {
    console.warn('Invalid interval, defaulting to 1');
    parsedInterval = 1;
  }

  if (frequency === 'weekly') {
    const selectedWeekdays = (weekdays || []).map((day) => day.toLowerCase());
    console.log('Weekly frequency, selected weekdays:', selectedWeekdays);
    let count = 0;
    let currentDate = new Date(startDateOnly);

    // If all weekdays are selected, treat as daily within date range
    const allWeekdaysSelected = selectedWeekdays.length === 7 &&
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        .every(day => selectedWeekdays.includes(day));

    if (allWeekdaysSelected && parsedInterval === 1) {
      console.log('All weekdays selected with interval 1, generating daily occurrences');
      while (currentDate <= endDateOnly && (!maxOccurrences || count < maxOccurrences)) {
        const date = new Date(currentDate);
        date.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC
        result.push(date.toISOString());
        count++;
        console.log(`Added daily occurrence: ${date.toISOString()}, count: ${count}`);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        if (maxOccurrences && count >= maxOccurrences) break;
      }
    } else {
      // Standard weekly recurrence
      while (currentDate <= endDateOnly && (!maxOccurrences || count < maxOccurrences)) {
        const weekStart = new Date(currentDate);
        weekStart.setUTCHours(0, 0, 0, 0);
        console.log(`Processing week starting: ${weekStart.toISOString()}`);
        for (let i = 0; i < 7; i++) {
          const date = new Date(weekStart);
          date.setUTCDate(weekStart.getUTCDate() + i);
          date.setUTCHours(0, 0, 0, 0);
          const dayName = date.toLocaleString('en-IN', { weekday: 'long' }).toLowerCase();

          if (
            selectedWeekdays.includes(dayName) &&
            date >= startDateOnly &&
            (!endDateOnly || date <= endDateOnly)
          ) {
            result.push(date.toISOString());
            count++;
            console.log(`Added weekly occurrence: ${date.toISOString()}, count: ${count}`);
            if (maxOccurrences && count >= maxOccurrences) break;
          }
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 7 * parsedInterval);
        if (maxOccurrences && count >= maxOccurrences) break;
      }
    }
  } else if (frequency === 'monthly') {
    const days = (monthDays || []).map(Number).filter((day) => day >= 1 && day <= 31);
    console.log('Monthly frequency, selected days:', days);
    let count = 0;
    let currentDate = new Date(startDateOnly);

    while (currentDate <= endDateOnly && (!maxOccurrences || count < maxOccurrences)) {
      for (const day of days) {
        const date = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), day));
        console.log(`Checking date: ${date.toISOString()}, day: ${day}`);
        if (date >= startDateOnly && (!endDateOnly || date <= endDateOnly)) {
          result.push(date.toISOString());
          count++;
          console.log(`Added monthly occurrence: ${date.toISOString()}, count: ${count}`);
          if (maxOccurrences && count >= maxOccurrences) break;
        }
      }
      currentDate.setUTCMonth(currentDate.getUTCMonth() + parsedInterval);
      if (maxOccurrences && count >= maxOccurrences) break;
    }
  }

  console.log('Calculated occurrences:', result);
  return result;
};