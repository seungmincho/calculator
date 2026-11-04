import { hydrateRoot } from 'react-dom/client'
import EverlandPlanner, { type PlannerProps } from '../components/EverlandPlanner'
const element = document.getElementById('everland-root')
const data = document.getElementById('everland-data')
if (element && data?.textContent) hydrateRoot(element,<EverlandPlanner {...JSON.parse(data.textContent) as PlannerProps} />)
