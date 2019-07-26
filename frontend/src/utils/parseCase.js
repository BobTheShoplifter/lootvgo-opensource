import parseItem from './parseItem'
import RequestStates from './requestStates'

export default function(box) {
  let status

  if (box.state === RequestStates.Limbo || box.state === RequestStates.Pending) status = 'pending'
  else if (box.state === RequestStates.Success) status = 'ready'
  else if (box.state === RequestStates.Opened) status = 'opened'

  if (box.item) box.item.caseId = box.schemaID

  return {
    internalID: box.id,
    id: box.caseID,
    caseID: box.schemaID,
    offerID: box.offerID,
    state: box.state,
    opened: box.state === RequestStates.Opened,
    status: status,
    date: box.date,
    openDate: box.openDate || null,
    item: box.item ? parseItem(box.item) : null
  }
}
