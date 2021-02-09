const genId = (l = 12) => Array(l).fill().map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
const handleFile = input => new Promise(resolve => {
    input.addEventListener('change', event => {
        const file = event.target.files[0];
        resolve(file);
    });
});
const getText = reader => new Promise(resolve => {
    reader.onload = data => {
        resolve(data.target.result);
    };
});
const csvline2array = line => line.slice(1, -1).split('","');
const entries2object = (keys, entries) => entries.reduce((state, value, i) => ({
    ...state,
    [keys[i]]: value
}), {});
const csv2json = text => {
    let list = text.split('\n').filter(Boolean).map(csvline2array);
    const keys = list.shift();
    return list.map(row => entries2object(keys, row));
};
const parseItem = (key, text) => {
    switch(key) {
        case 'link':
            return `<a href="${text}" target="_blank">${key}</a>`;
        case 'viewdate': {
            const date = text.split(',').shift();
            const [d, m, y] = date.split('.');
            const target = `month-${m}-${y}`;
            return `<a title="${text}" id="${target}">${date}</a>`;
        }
        case 'month': {
            const [m, y] = text.split(' ');
            const month = new Date(y, m - 1).toLocaleString('ru', { month: 'long' });
            const target = `month-${m}-${y}`;
            return `<a href="#${target}">${month} ${y}</a>`;
        }
        case 'm': {
            const [m, y] = text.split(' ');
            const month = new Date(y, m - 1).toLocaleString('ru', { month: 'long' });
            return `${month} ${y}`;
        }
        case 'duration': {
            const total = text.split(' ').shift();
            const h = Math.floor(total / 60);
            const m = total % 60;
            return `${h}ч. ${m}м.`;
        }
    }
    return text;
};
const addContent = html => {
    const output = document.querySelector('#output');
    const div = document.createElement('div');
    div.innerHTML = html;
    output.appendChild(div);
};
const renderTable = list => {
    const keys = Object.keys(list[0]);
    const html = `
        <table>
            <tr>
                ${keys.map(key => `<th>${key}</th>`).join('')}
            </tr>
            ${list.map(row => `
            <tr>
                ${Object.entries(row).map(([k, v]) => `
                    <td class="col-${k}">${parseItem(k, v)}</td>
                `).join('')}
            </tr>
            `).join('')}
        </table>
    `;
    addContent(html);
};
const getMonthStat = list => {
    const data = {};
    list.forEach(item => {
        const [d, m, y] = item.viewdate.split(/[,.\s]/);
        const key = `${m} ${y}`;
        data[key] = (data[key] || 0) + 1;
    });
    return Object.entries(data).map(([month, count]) => ({ month, count }));
};
const getDayStat = list => {
    const data = {};
    list.forEach(item => {
        const [d, m, y] = item.viewdate.split(/[,.\s]/);
        const key = `${d} ${m} ${y}`;
        data[key] = (data[key] || 0) + 1;
    });
    return Object.entries(data).map(([date, count]) => ({ date, count }));
};
renderChart = stat => {
    const id = genId();

    addContent(`
        <div id="chart-${id}" style="position: relative; height: 300px; width: 100%;">
            <canvas></canvas>
        </div>
    `);

    const ctx = document.querySelector(`#chart-${id} canvas`).getContext('2d');

    var labels = stat.map(({ month }) => parseItem('m', month)).reverse();
    var data = stat.map(({ count }) => count).reverse();

    var config = {
        type: 'line',
        data: {
            labels,
            datasets: [{
                backgroundColor: 'transparent',
                borderColor: '#FF6600',
                data,
                borderWidth: 1,
                pointRadius: 2,
            }]
        },
        options: {
            maintainAspectRatio: false,
            legend: {
                display: false,
            },
            tooltips: {
                mode: 'index',
            },
        }
    };

    new Chart(ctx, config);
};
const importCSV = async () => {
    const input = document.querySelector('#file');
    const file = await handleFile(input);
    const reader = new FileReader();
    reader.readAsText(file);
    const text = await getText(reader);
    const list = csv2json(text);

    renderTable(list);

    const monthStat = getMonthStat(list);
    addContent('<h3>By month</h3>');
    renderChart(monthStat);
    renderChart(monthStat.slice(0, -7));
    renderTable(monthStat);
    // const sortedMonthStat = monthStat.sort((a, b) => a.count < b.count ? 1 : -1);
    // renderTable(sortedMonthStat);

    const dayStat = getDayStat(list);
    const sortedDayStat = dayStat
        .sort((a, b) => a.count < b.count ? 1 : -1)
        .filter(({ count }) => count > 1);
    addContent('<h3>By day</h3>');
    renderTable(sortedDayStat);
}
// const getKP = async () => {
//     const input = document.querySelector('#get-kp');
//     await new Promise(resolve => {
//         input.addEventListener('click', resolve);
//     });
// };
const main = () => {
    importCSV();
    // getKP();
};
document.addEventListener('DOMContentLoaded', main);
