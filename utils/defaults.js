export const getDefaultCategoryItems = () => {
    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const now = new Date();
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
    const yearsAgo = (n) => { const d = new Date(now); d.setFullYear(d.getFullYear() - n); return d; };

    return {
        'Groceries': [
            { id: 'base-1', name: 'Groceries - Example', date: formatDate(now), amount: 100, isBase: true },
        ],
        'Rent': [
            { id: 'base-2', name: 'Rent - Example', date: formatDate(daysAgo(8)), amount: 100, isBase: true },
        ],
        'Entertainment': [
            { id: 'base-5', name: 'Entertainment - Example', date: formatDate(daysAgo(30)), amount: 100, isBase: true },
        ],
        'Subscriptions': [
            { id: 'base-9', name: 'Subscriptions - Example', date: formatDate(yearsAgo(1)), amount: 100, isBase: true },
        ],
        'Savings': [
            { id: 'base-10', name: 'Savings - Example', date: formatDate(yearsAgo(2)), amount: 100, isBase: true },
        ],
    };
};
