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
	switch (key) {
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
			if (Number(y).toString() !== y) {
				return text;
			}
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
	output.appendChild(div.children[0]);
};
const css = (styles = {}) => Object.entries(styles).map(([key, value]) => `${key}: ${value}`).join(';');
const renderTable = (list, styles) => {
	const keys = Object.keys(list[0]);
	const html = `
		<table style="${css(styles)}">
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
const getHoursStat = (list, skip) => {
	const data = {};
	list.forEach(item => {
		const [D, M, Y, h, m] = item.viewdate.split(/[,.:\s]+/ig);
		const key = h;
		// skip records before Juny 2013
		const crop = Number(Y) <= 2013 && Number(M) <= 5
		if (!skip || !crop) {
			data[key] = (data[key] || 0) + 1;
		}
	});
	const result = Object.entries(data)
		.map(([key, value]) => ({ key, value }))
		.sort((a, b) => Number(a.key) < Number(b.key) ? 1 : -1)
	return result
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
const randomColor = () => {
	return '#' + Math.floor(0x100000 + Math.random() * 0xefffff).toString(16);
}

function byte2Hex(n) {
	var nybHexString = "0123456789ABCDEF";
	return String(nybHexString.substr((n >> 4) & 0x0F, 1)) + nybHexString.substr(n & 0x0F, 1);
}
function RGB2Color(r, g, b) {
	return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
}
const getRainbow = n => {
	var frequency = .45;
	const a = [];
	for (var i = 0; i < n; ++i) {
		red = Math.sin(frequency * i + 0) * 127 + 128;
		green = Math.sin(frequency * i + 2) * 127 + 128;
		blue = Math.sin(frequency * i + 4) * 127 + 128;

		a.push(RGB2Color(red, green, blue));
	}
	return a;
};

const renderChart = (stat, keys = {}) => {
	const id = genId();

	addContent(`
		<div id="chart-${id}" style="position: relative; height: 300px; width: 100%;">
			<canvas></canvas>
		</div>
	`);

	const ctx = document.querySelector(`#chart-${id} canvas`).getContext('2d');

	const colors = getRainbow(stat?.vlabels?.length || 0);

	const labels = stat.labels || stat.map(e => parseItem(keys.type || 'm', e[keys.label || 'month'])).reverse();
	const datasets = stat.data ? stat.data.map(
		(item, index) => ({
			backgroundColor: 'transparent',
			borderColor: colors.shift(),
			data: item,
			borderWidth: 1,
			pointRadius: 2,
			label: stat?.vlabels?.[index],
		})
	) : [
		{
			backgroundColor: 'transparent',
			borderColor: '#FF6600',
			data: stat.map((e) => e[keys.data || 'count']).reverse(),
			borderWidth: 1,
			pointRadius: 2,
		},
	];

	const config = {
		type: 'line',
		data: {
			labels,
			datasets,
		},
		options: {
			maintainAspectRatio: false,
			interaction: {
				intersect: false,
				mode: 'index',
			},
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					callbacks: {
						labelColor: function (context) {
							return {
								borderColor: 'transparent',
								backgroundColor: context.dataset.borderColor,
								borderWidth: 2,
								borderDash: [2, 2],
								borderRadius: 2,
							};
						},
					}
				}
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

	renderTable(monthStat, { width: '50%' });
	// const sortedMonthStat = monthStat.sort((a, b) => a.count < b.count ? 1 : -1);
	// renderTable(sortedMonthStat);

	const dayStat = getDayStat(list);
	const sortedDayStat = dayStat
		.sort((a, b) => a.count < b.count ? 1 : -1)
		.filter(({ count }) => count > 1);
	renderTable(sortedDayStat, { width: '50%' });

	renderChart(monthStat);

	renderChart(monthStat.slice(0, -7));

	const yearStat = monthStat.slice(0, -7).reduce((list, item) => {
		const [month, year] = item.month.split(' ');
		return {
			...list,
			[year]: list[year] ? [...list[year], item] : [item]
		}
	}, {});
	const yearStatFilled = Object.entries(yearStat).reduce((list, [year, item]) => {
		const months = Array(12).fill().map((e, i) => String(i + 1).padStart(2, '0'));
		const filledItem = months.map(month => item.find(e => e.month.split(' ')[0] === month) || { month: `${month} ${year}`, count: 0 });
		return {
			...list,
			[year]: filledItem,
		}
	}, {})

	const byMonthsInYears = {
		labels: Array(12).fill().map((e, i) => new Date(9999, i).toLocaleString('ru', { month: 'long' })),
		vlabels: Object.keys(yearStatFilled),
		data: Object.entries(yearStatFilled).map(([year, item]) => item.map(e => e.count))
	};
	renderChart(byMonthsInYears);

	const hoursStat = getHoursStat(list)
	renderChart(hoursStat, { type: '', label: 'key', data: 'value' });

	const hoursStatCropped = getHoursStat(list, true)
	renderChart(hoursStatCropped, { type: '', label: 'key', data: 'value' });
	const years = {}
	let min = Infinity;
	let max = 0;
	list.forEach((item) => {
		if (isNaN(Number(item.year))) {
			return;
		}

		years[item.year] = (years[item.year] || 0) + 1;
		min = Math.min(min, Number(item.year));
		max = Math.max(max, Number(item.year));
	});
	let yearsList = [];
	for (let i = min; i <= max; i++) {
		yearsList.push({ key: String(i), value: years[i] || 0 })
	}
	renderChart(yearsList.reverse(), { type: '', label: 'key', data: 'value' });
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
