const SummaryTable = ({ items }) => (
  <div className="overflow-x-auto mb-6">
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-4 py-2 text-left">Item ID</th>
          <th className="px-4 py-2 text-left">Item Name</th>
          <th className="px-4 py-2 text-left">Variant</th>
          <th className="px-4 py-2 text-right">Sold Quantity</th>
          <th className="px-4 py-2 text-right">Total Income</th>
          <th className="px-4 py-2 text-right">Profit</th>
        </tr>
      </thead>
      <tbody>
        {items.sort((a, b) => a.productId.localeCompare(b.productId))
        .map(item => (
          <tr key={`${item.productId}_${item.variant || 'Standard'}`} className="border-b">
            <td className="px-4 py-2">{item.productId}</td>
            <td className="px-4 py-2">{item.name}</td>
            <td className="px-4 py-2">
              <span className={`px-2 py-1 rounded text-sm ${
                item.variant && item.variant !== 'Standard'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {item.variant || 'Standard'}
              </span>
            </td>
            <td className="px-4 py-2 text-right">{item.soldQuantity}</td>
            <td className="px-4 py-2 text-right">
              Rs. {item.totalIncome.toFixed(2)}
            </td>
            <td className="px-4 py-2 text-right text-green-600 font-semibold">
              Rs. {item.profit.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default SummaryTable;
