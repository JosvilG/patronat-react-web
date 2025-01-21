import { Timestamp } from 'firebase/firestore'

export const createEventModel = () => ({
  title: '',
  description: '',
  startDate: new Date().toISOString().split('T')[0],
  startTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
  endDate: new Date().toISOString().split('T')[0],
  endTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
  location: '',
  capacity: 0,
  price: 0,
  minAge: 0,
  collaborators: [],
  tags: [],
  category: '',
  imageURL: '',
  organizer: '',
  allowCars: false,
  hasBar: false,
  status: 'Activo',
  createdAt: Timestamp.now(),
  eventImage: '',
})
