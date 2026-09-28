import { Link } from 'react-router-dom';
import StatusPill from '../../components/StatusPill';
import PriorityBadge from '../../components/PriorityBadge';
import { formatDate } from '../../utils/dates';

const COLUMNS = [
  'Customer',
  'Phone',
  'Service',
  'Status',
  'Priority',
  'Assignee',
  'Created',
];

/**
 * The list centrepiece. One real <table> for desktop; below 760px CSS turns
 * each row into a stacked card using `data-label`, so screen readers and the
 * keyboard keep a single, honest table structure at every width.
 */
export default function RequestsTable({ requests }) {
  return (
    <div className="req-table-wrap">
      <table className="req-table">
        <caption className="sr-only">
          {requests.length} service request{requests.length === 1 ? '' : 's'}
        </caption>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((request, index) => (
            <tr key={request.id} className="req-row" style={{ '--i': index }}>
              <td data-label="Customer">
                <Link className="req-table__link" to={`/requests/${request.id}`}>
                  {request.customerName}
                </Link>
              </td>
              <td data-label="Phone" className="req-table__mono">
                {request.phone}
              </td>
              <td data-label="Service" className="req-table__service">
                {request.service}
              </td>
              <td data-label="Status">
                <StatusPill status={request.status} />
              </td>
              <td data-label="Priority">
                <PriorityBadge priority={request.priority} />
              </td>
              <td data-label="Assignee">
                {request.assignee ? (
                  <span className="assignee">{request.assignee.name}</span>
                ) : (
                  <span className="muted">Unassigned</span>
                )}
              </td>
              <td data-label="Created" className="req-table__date">
                {formatDate(request.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
