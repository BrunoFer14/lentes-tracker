// src/styles/homeStyles.js
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6fc',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    position: 'relative',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 36,
    lineHeight: 40,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  grid2x2: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 18,
  },
  pageModal: {
    marginTop: 120,
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222',
    letterSpacing: 1,
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
    color: '#444',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    width: 100,
    textAlign: 'center',
    marginBottom: 18,
  },

  // toggles Dias/Horas
  toggleRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#eee',
  },
  toggleOptionActive: {
    backgroundColor: '#4F8EF7',
  },
  toggleOptionText: {
    textAlign: 'center',
    color: '#444',
  },
  toggleOptionTextActive: {
    color: '#fff',
  },
});
