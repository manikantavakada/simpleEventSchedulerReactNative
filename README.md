Simple Event Scheduler
A React Native application for scheduling single and recurring events, stored in a SQLite database.
Features

Create single or recurring (weekly/monthly) events.
View events by date or event ID.
Android: ToastAndroid notification on event creation.
iOS: Alert notification on event creation.
Indian date format (DD/MM/YYYY) in event listings.

Setup

Clone the repository:git clone https://github.com/manikantavakada/simpleEventScheduler.git
cd simpleEventScheduler


Install dependencies:npm install


For iOS, install Pods:cd ios && pod install
cd ..


Run the app:npx react-native run-android
# or
npx react-native run-ios



Dependencies

react-native-sqlite-storage
react-native-gesture-handler
@react-native-picker/picker
react-native-multiple-select
@react-native-community/datetimepicker
react-native-vector-icons

Project Structure

CreateEventScreen.js: Event creation UI with form and ToastAndroid/alert.
api.js: SQLite database and event logic (single/recurring).
EventDatesScreen.js: Displays events by date or event ID.
assets/: Images (e.g., arrow.png).

Notes

Ensure .gitignore excludes node_modules, build folders, and sensitive files.
Database: EventsDB stores events in SingleEvents, RecurringEvents, and EventOccurrences tables.

