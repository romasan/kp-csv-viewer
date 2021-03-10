const promise_pool = (list, fn) => new Promise(resolve => {
    const result = Array(list.length).fill({status: 0});
    const callback = async cell => {
        const next = result.findIndex(e => e.status === 0);
        if (fn) {
        	const count = result.reduce((c, e) => c + ((e.status === 2) ? 1 : 0), 0);
        	fn(count);
        }
        if (next >= 0) {
            result[next] = {status: 1};
            const value = await list[next]();
            result[next] = {status: 2, value};
            callback(cell);
        } else if (result.findIndex(e => e.status === 1) < 0) {
            resolve(result.map(({ value }) => value));
        }
    }
    for (let cell = 0, length = list.length; cell < length; cell++) {
        callback(cell);
    }
});

const kp = {};

kp.getViewedListFromEl = el => {
    return [...el.querySelectorAll('.item')]
        .filter(e => !e.classList.contains('itemAct'))
        .filter(e => e.children[0].tagName === 'DIV')
        .map(({children: [i, film, date]}) => ({
            i: Number(i.innerText),
            film,
            viewdate: date.innerText
        }))
        .map(({i, film, viewdate}) => ({
            index: i,
            ...((ru => ({
                ru: ru[0].slice(0, -1),
                en: film.querySelector('.nameEng').innerText,
                year: ru[ru.length - 2],
            }))(film.querySelector('.nameRus').innerText.split(/[\(\)]/ig))),
            ...((([rate,count,duration]) => ({
                rate: rate ? rate.innerText : '',
                duration: duration ? duration.innerText : '',
            }))(
                film.querySelector('.rating').children
            )),
            viewdate,
            link: film.querySelector('a').href,
        }))
}

kp.getPages = () => {
    let t = [...document.querySelectorAll('.arr')]
        .pop()
        .children[0]
        .href
        .split('/');
    const num = Number(t.splice(-2, 1, '{p}'));
    t = t.join('/');
    return Array(num - 1)
        .fill()
        .map((e, i) => i + 2)
        .map(p => t.replace('{p}', p));
}

kp.fetchPages = pages => new Promise(async resolve => {
    let url = null;
    // let data = [];
    const count = pages.length;
    const now = Date.now();

    // while(url = pages.shift()) {
    //   kp.echo(`download ${count - pages.length}/${count}`);
    //   data.push(await fetch(url));
    // }

    const list = pages.map(url => () => fetch(url));
    const data = await promise_pool(list, progress => {
    	kp.echo(`download ${progress}/${count}`)
    });
    
    // const list = pages.map(url => fetch(url));
    // const data = await Promise.all(list);

    kp.echo(`downloaded at ${Math.floor((Date.now() - now) / 1000)} sec. ${(Date.now() - now) % 1000} ms. `);
    resolve(data);
});

kp.aofo2md = list => {
    const keys = Object.keys(list[0]);
    let s = keys.join('|') + '\n';
    s = s + keys.map(() => '-').join('|') + '\n';
    for (const line of list) {
    	s = s + Object.entries(line).map(([v, e]) => e).join('|') + '\n';
    }
    return s;
}

kp.aofo2csv = list => {
    const keys = Object.keys(list[0]);
    let s = keys.map(e => '"' + e + '"').join(',') + '\n';
    for (const line of list) {
        for (const ik in keys) {
            s = s + '"' + line[keys[ik]] + '"' + ((ik < (keys.length - 1)) ? ',' : '\n');
        }
    }
    return s;
};

kp.text2file = (text, file, type = 'text/plain') => {
	// kp.echo('done');
    const blob = new Blob([text], { type });
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = file;
    elem.click();
}

kp.text2gist = (text, name) => {
	const gist_id = localStorage.ghGistId;
	const gh_token = localStorage.ghToken;
	alert(`${name} (${text.length}): https://api.github.com/gists/${gist_id}`)
	return fetch(`https://api.github.com/gists/${gist_id}`, {
	    method: 'POST',
	    headers: {
	      'Authorization': `token ${gh_token}`
	    },
	    body: JSON.stringify({
	          "description": name,
	          "public": false,
	          "files": {
	            "output.md": {
	              "content": text
	            },
	          }
	    })
	})
}

kp.downloadViewed = () => {
    let list = kp.getViewedListFromEl(document);
    const pages = kp.getPages();
    kp.fetchPages(pages)
        .then(async all => {
            const texts = await Promise.all(all.map(e => e.text()));
            texts.forEach((text, i) => {
                let a = document.createElement('a');
                a.innerHTML = text;
                const sublist = kp.getViewedListFromEl(a);
                list = list.concat(sublist);
            });
            return list;
        })
        .then(list => kp.aofo2csv(list))
        .then(text => {
            const name = ('kinoposk ' + ('' + new Date()).split('(').shift()).replace(/\s/ig, '-').slice(0, -1) + '.csv';
            kp.text2file(text, name, 'text/csv')
        });
        // .then(list => kp.aofo2md(list))
        // .then(text => {
        //     const name = ('kinoposk ' + ('' + new Date()).split('(').shift()).replace(/\s/ig, '-').slice(0, -1);
        //     kp.text2gist(text, name)
        // });
}

kp.echo = (text) => {
	let e = document.querySelector('.export-csv');
	e && (e.innerText = 'Export CSV: ' + text);
}

kp.start = () => {
	try {
    let e = document.querySelector('.js-rum-hero')?.nextElementSibling?.nextElementSibling;
    e && e.classList.remove('clear');
    e && e.classList.add('export-csv');
    e && (e.innerHTML = '<button>💾 Export CSV</button>');
    e?.addEventListener('click', kp.downloadViewed);
	} catch (e) {
		alert(e);
	}
}

// document.addEventListener('DOMContentLoaded', kp.start);
kp.start();

if (!localStorage.ghToken) {
	const key = prompt('Github Personal Access Token:');
	if (key) {
		localStorage.ghToken = key;
	}
}

if (!localStorage.ghGistId) {
	const key = prompt('Github Gist ID:');
	if (key) {
		localStorage.ghGistId = key;
	}
}