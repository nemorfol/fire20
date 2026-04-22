export interface GuideStep {
	id: string;
	number: number;
	title: string;
	category: string;
	icon: string;
	summary: string;
	content: string;
	appLink?: string;
	appLinkLabel?: string;
}

export const categories = [
	'Fondamenti',
	'Calcoli e Simulazioni',
	'Fiscalità Italiana',
	'Strategie Avanzate',
	'Preparazione Finale'
] as const;

export type GuideCategory = (typeof categories)[number];

export const guideSteps: GuideStep[] = [
	// ============================================================
	// CATEGORY: Fondamenti (Steps 1-4)
	// ============================================================
	{
		id: 'cos-e-fire',
		number: 1,
		title: "Cos'è il FIRE",
		category: 'Fondamenti',
		icon: '🔥',
		summary:
			"Introduzione al movimento FIRE: Financial Independence, Retire Early. Scopri la filosofia, la storia e le diverse varianti.",
		content: `
<h3>Il Movimento FIRE: Libertà Finanziaria</h3>
<p>FIRE è l'acronimo di <strong>Financial Independence, Retire Early</strong> (Indipendenza Finanziaria, Pensionamento Anticipato). Non si tratta semplicemente di smettere di lavorare il prima possibile, ma di raggiungere un livello di patrimonio tale da rendere il lavoro una <strong>scelta</strong>, non un obbligo.</p>

<p>Il concetto è semplice: se accumuli un patrimonio sufficiente a generare rendimenti passivi che coprono le tue spese annuali, sei finanziariamente indipendente. Non devi più scambiare il tuo tempo per denaro, a meno che tu non lo voglia.</p>

<h3>Una Breve Storia</h3>
<p>Il movimento FIRE ha le sue radici nel libro <strong>"Your Money or Your Life"</strong> di Vicki Robin e Joe Dominguez (1992), che per primo ha posto la domanda: "Quanta della tua vita stai scambiando per comprare cose di cui non hai bisogno?". Il concetto è stato poi formalizzato dalla comunità finanziaria americana, in particolare attraverso blog come Mr. Money Mustache, che nel 2011 ha dimostrato come sia possibile andare in pensione a 30 anni con un reddito normale.</p>

<p>In Italia il movimento è cresciuto significativamente dal 2018, con comunità su Reddit (r/ItaliaPersonalFinance), blog dedicati e una crescente consapevolezza finanziaria tra i millennial italiani.</p>

<h3>Le Varianti del FIRE</h3>
<p>Non esiste un solo modo di essere FIRE. Ecco le principali varianti:</p>

<ul>
<li><strong>LeanFIRE</strong> — Vivere con un budget molto contenuto, tipicamente sotto i 20.000€ annui per persona in Italia. Richiede un patrimonio più basso (circa 500.000-600.000€) ma uno stile di vita frugale e spesso la vita in zone a basso costo.</li>
<li><strong>FatFIRE</strong> — Mantenere uno stile di vita confortevole o lussuoso, con spese annue di 40.000-80.000€ o più. Richiede patrimoni di 1-2 milioni di euro, ma permette viaggi, ristoranti e hobbies senza preoccupazioni.</li>
<li><strong>BaristaFIRE</strong> — Raggiungere un patrimonio che copre gran parte delle spese, integrando con un lavoro part-time o a bassa intensità. In Italia potrebbe significare fare il freelance per 10.000-15.000€ l'anno mentre il portafoglio copre il resto.</li>
<li><strong>CoastFIRE</strong> — Aver accumulato abbastanza da giovani che, grazie all'interesse composto, il patrimonio crescerà da solo fino all'età pensionabile tradizionale. Non servono più risparmi aggiuntivi, solo coprire le spese correnti.</li>
</ul>

<div class="example">
<strong>Esempio pratico:</strong> Marco, 35 anni, sviluppatore software a Milano, guadagna 45.000€ netti l'anno. Spende 24.000€ l'anno (2.000€/mese). Il suo FIRE number con la regola del 4% è 600.000€. Con un tasso di risparmio del 47% e rendimenti del 7% annuo lordo, potrebbe raggiungere il FIRE in circa 14 anni, a 49 anni. Se optasse per un LeanFIRE a 18.000€/anno, il target scende a 450.000€ e il tempo a circa 11 anni.
</div>

<h3>La Filosofia Dietro il FIRE</h3>
<p>Il FIRE non è solo matematica. È un cambio di mentalità profondo:</p>
<ul>
<li><strong>Tempo vs Denaro</strong> — Ogni acquisto ha un costo in ore di vita lavorativa. Quel cappuccino da 1,50€ al bar ogni mattina sono 547€ l'anno, che investiti per 20 anni al 7% diventano oltre 22.000€.</li>
<li><strong>Consumismo consapevole</strong> — Non si tratta di privazione, ma di spendere in modo intenzionale su ciò che davvero ti rende felice.</li>
<li><strong>Sicurezza vs libertà</strong> — Un fondo di emergenza e un patrimonio crescente riducono l'ansia e aumentano il potere negoziale con il datore di lavoro.</li>
<li><strong>Il lavoro come scelta</strong> — Molti che raggiungono il FIRE continuano a lavorare, ma su progetti che amano, senza la pressione dello stipendio.</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Non ossessionarti con la data esatta del FIRE. Il percorso stesso migliora la tua vita: meno debiti, più risparmi, più consapevolezza. Anche raggiungere il 50% del tuo FIRE number ti cambia la vita, perché saprai di avere anni di autonomia finanziaria.
</div>

<h3>Il FIRE in Italia: Sfide e Opportunità</h3>
<p>L'Italia presenta sfide specifiche per chi aspira al FIRE:</p>
<ul>
<li><strong>Stipendi più bassi</strong> della media europea (RAL media ~30.000€)</li>
<li><strong>Pressione fiscale elevata</strong> (aliquote marginali IRPEF fino al 43%)</li>
<li><strong>Tassazione sugli investimenti</strong> al 26% (ma solo 12,5% sui titoli di Stato)</li>
<li><strong>Sistema pensionistico generoso</strong> ma con età pensionabile crescente</li>
</ul>
<p>Ma ci sono anche vantaggi:</p>
<ul>
<li><strong>Costo della vita</strong> più basso rispetto a Nord Europa e USA, specialmente fuori dalle grandi città</li>
<li><strong>Sanità pubblica</strong> che riduce enormemente i costi sanitari rispetto agli USA</li>
<li><strong>Fondi pensione</strong> con vantaggi fiscali eccezionali (deducibilità fino a 5.300€)</li>
<li><strong>Qualità della vita</strong> — clima, cibo, cultura — che rende il LeanFIRE molto più piacevole</li>
</ul>

<div class="warning">
<strong>Attenzione:</strong> Il FIRE non è per tutti. Richiede disciplina, pazienza e la capacità di andare controcorrente rispetto alla cultura del consumo. Prima di iniziare, assicurati di avere un fondo di emergenza di almeno 3-6 mesi di spese e nessun debito ad alto interesse (carte di credito revolving, prestiti al consumo).
</div>
`
	},

	{
		id: 'profilo-finanziario',
		number: 2,
		title: 'Il Tuo Profilo Finanziario',
		category: 'Fondamenti',
		icon: '👤',
		summary:
			"Come valutare la tua situazione finanziaria attuale: redditi, spese, patrimonio netto e obiettivi.",
		appLink: '/profilo/',
		appLinkLabel: 'Vai al Profilo Finanziario',
		content: `
<h3>Fotografa la Tua Situazione Attuale</h3>
<p>Prima di pianificare il percorso verso il FIRE, devi sapere esattamente dove ti trovi. Questo significa costruire una fotografia completa e onesta della tua situazione finanziaria. Non barare con te stesso: sottostimare le spese o sovrastimare i risparmi è il modo più sicuro per fallire.</p>

<h3>Calcola il Tuo Reddito Netto</h3>
<p>Il primo passo è conoscere il tuo <strong>reddito netto mensile e annuo</strong>. In Italia, con il sistema di buste paga complesso, molti non sanno esattamente quanto guadagnano.</p>

<ul>
<li><strong>Stipendio netto mensile</strong> — Quello che arriva sul conto, inclusa la media delle mensilità aggiuntive (13ª e 14ª se prevista dal CCNL)</li>
<li><strong>Reddito annuo netto</strong> = stipendio netto × 12 + tredicesima netta + eventuale quattordicesima + bonus variabili medi</li>
<li><strong>Altri redditi</strong> — Affitti, freelancing, dividendi, interessi</li>
</ul>

<div class="example">
<strong>Esempio:</strong> RAL 35.000€ → stipendio netto circa 1.850€/mese × 12 = 22.200€, più tredicesima netta ~1.700€ = circa <strong>23.900€ netti annui</strong>. Se hai anche un affitto da 400€/mese netti (cedolare secca 21%), aggiungi 4.800€ per un totale di 28.700€.
</div>

<h3>Traccia le Tue Spese Reali</h3>
<p>La maggior parte delle persone sottostima le proprie spese del 20-30%. Per avere dati reali:</p>

<ul>
<li><strong>Analizza gli estratti conto</strong> degli ultimi 12 mesi (non solo gli ultimi 3, per catturare spese annuali come assicurazioni, vacanze, regali di Natale)</li>
<li><strong>Categorizza tutto</strong>: abitazione, alimentari, trasporti, salute, svago, abbigliamento, altro</li>
<li><strong>Separa spese fisse e variabili</strong></li>
</ul>

<p>Le categorie tipiche per un italiano:</p>
<ul>
<li><strong>Abitazione</strong> (affitto/mutuo, condominio, utenze, IMU): 600-1.500€/mese</li>
<li><strong>Alimentari e casa</strong>: 300-500€/mese per persona</li>
<li><strong>Trasporti</strong> (auto, benzina, assicurazione, bollo, manutenzione, o abbonamento TPL): 200-400€/mese</li>
<li><strong>Salute</strong> (visite private, farmaci, dentista): 50-150€/mese</li>
<li><strong>Svago e viaggi</strong>: 100-400€/mese</li>
<li><strong>Abbigliamento</strong>: 50-100€/mese</li>
<li><strong>Abbonamenti</strong> (telefono, internet, streaming, palestra): 80-150€/mese</li>
<li><strong>Altro</strong> (regali, imprevisti, varie): 100-200€/mese</li>
</ul>

<h3>Calcola il Tuo Patrimonio Netto</h3>
<p>Il patrimonio netto è la differenza tra ciò che possiedi e ciò che devi:</p>

<p><strong>Patrimonio Netto = Attività - Passività</strong></p>

<p><strong>Attività:</strong></p>
<ul>
<li>Conti correnti e depositi</li>
<li>Investimenti (ETF, azioni, obbligazioni, fondi)</li>
<li>Fondo pensione complementare</li>
<li>TFR maturato</li>
<li>Immobili (valore di mercato realistico)</li>
<li>Buoni postali, BTP, certificati di deposito</li>
<li>Crypto (se presenti)</li>
</ul>

<p><strong>Passività:</strong></p>
<ul>
<li>Mutuo residuo</li>
<li>Prestiti personali</li>
<li>Finanziamenti auto</li>
<li>Debiti con carte di credito</li>
</ul>

<div class="example">
<strong>Esempio:</strong> Laura, 32 anni, impiegata a Roma.<br>
Attività: Conto corrente 8.000€ + ETF 45.000€ + Fondo pensione 12.000€ + TFR 18.000€ = <strong>83.000€</strong><br>
Passività: Nessun debito.<br>
Patrimonio netto: <strong>83.000€</strong><br>
Con spese annue di 22.000€ e FIRE number di 550.000€, è al <strong>15%</strong> del percorso.
</div>

<h3>Definisci i Tuoi Obiettivi FIRE</h3>
<p>Rispondi a queste domande fondamentali:</p>
<ul>
<li>Quali spese avrai in pensione? (Probabilmente meno: niente pendolarismo, meno pranzi fuori, ma forse più viaggi e hobbies)</li>
<li>Dove vivrai? (Il costo della vita varia enormemente: Milano vs un paese della Calabria)</li>
<li>Avrai figli? Quanti? (Un figlio costa 100.000-170.000€ dalla nascita ai 18 anni in Italia)</li>
<li>Vuoi lasciare un'eredità o spendere tutto? (Cambia radicalmente i calcoli)</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Compila il profilo finanziario nell'app con dati reali, non arrotondati. La differenza tra spendere 1.800€ e 2.200€ al mese sembra piccola, ma sul FIRE number è la differenza tra 540.000€ e 660.000€ — servono anni di risparmio in più. Aggiorna il profilo almeno una volta all'anno.
</div>

<div class="warning">
<strong>Attenzione:</strong> Non includere la prima casa nel calcolo del patrimonio investibile per il FIRE, a meno che tu non abbia intenzione di venderla. La casa in cui vivi non genera reddito e non puoi "mangiare i muri".
</div>
`
	},

	{
		id: 'fire-number',
		number: 3,
		title: 'Il FIRE Number',
		category: 'Fondamenti',
		icon: '🎯',
		summary:
			"Come calcolare il numero magico che ti serve per raggiungere l'indipendenza finanziaria.",
		appLink: '/calcolatore/',
		appLinkLabel: 'Calcola il tuo FIRE Number',
		content: `
<h3>Il Numero Più Importante della Tua Vita</h3>
<p>Il <strong>FIRE Number</strong> è il patrimonio investito necessario per vivere dei rendimenti senza intaccare il capitale (o intaccandolo in modo sostenibile). È il traguardo numerico del tuo percorso verso l'indipendenza finanziaria.</p>

<p>La formula base è semplicissima:</p>
<p><strong>FIRE Number = Spese Annuali × 25</strong></p>
<p>(che è l'inverso della regola del 4%: 1 / 0,04 = 25)</p>

<h3>Come Calcolarlo per l'Italia</h3>
<p>In Italia dobbiamo considerare la tassazione sui rendimenti. Se il portafoglio genera rendimenti e questi vengono tassati al 26%, il rendimento netto è inferiore. Questo può aumentare leggermente il moltiplicatore necessario.</p>

<div class="example">
<strong>Calcolo base:</strong><br>
Spese mensili: 2.000€ → Spese annuali: 24.000€<br>
FIRE Number = 24.000€ × 25 = <strong>600.000€</strong><br><br>
<strong>Con aggiustamento fiscale italiano (26% capital gain):</strong><br>
Per prelevare 24.000€ netti, considerando che parte del prelievo è rendimento tassato al 26% e parte è restituzione di capitale (non tassata), il FIRE Number effettivo si alza leggermente. Un moltiplicatore di 28-30 è più conservativo per l'Italia:<br>
FIRE Number prudente = 24.000€ × 28 = <strong>672.000€</strong>
</div>

<h3>Tabella di Riferimento</h3>
<p>Ecco una tabella con diversi livelli di spesa e i relativi FIRE Number:</p>

<ul>
<li><strong>1.200€/mese</strong> (14.400€/anno) → FIRE Number: 360.000€ (base) / 403.000€ (prudente)</li>
<li><strong>1.500€/mese</strong> (18.000€/anno) → FIRE Number: 450.000€ / 504.000€</li>
<li><strong>2.000€/mese</strong> (24.000€/anno) → FIRE Number: 600.000€ / 672.000€</li>
<li><strong>2.500€/mese</strong> (30.000€/anno) → FIRE Number: 750.000€ / 840.000€</li>
<li><strong>3.000€/mese</strong> (36.000€/anno) → FIRE Number: 900.000€ / 1.008.000€</li>
<li><strong>4.000€/mese</strong> (48.000€/anno) → FIRE Number: 1.200.000€ / 1.344.000€</li>
</ul>

<h3>Perché il FIRE Number È Così Importante</h3>
<p>Il FIRE Number ti dà un obiettivo concreto e misurabile. Senza un numero, "diventare indipendenti finanziariamente" è un sogno vago. Con un numero, è un progetto con tappe intermedie:</p>

<ul>
<li><strong>25%</strong> del FIRE Number — Hai un "cuscinetto di sicurezza" di anni. Puoi permetterti rischi di carriera maggiori.</li>
<li><strong>50%</strong> (Half-FI) — L'interesse composto inizia a fare il lavoro pesante. I tuoi investimenti contribuiscono significativamente alla crescita.</li>
<li><strong>75%</strong> — Sei quasi arrivato. I rendimenti annui del portafoglio potrebbero già coprire gran parte delle spese.</li>
<li><strong>100%</strong> — FIRE raggiunto! Il lavoro è ora opzionale.</li>
</ul>

<h3>Fattori che Influenzano il FIRE Number</h3>
<p>Il FIRE Number non è fisso. Dipende da variabili che puoi in parte controllare:</p>

<ul>
<li><strong>Le tue spese</strong> — Il fattore più importante. Ridurre le spese di 500€/mese abbassa il FIRE Number di 150.000€ e contemporaneamente aumenta il risparmio mensile.</li>
<li><strong>Il tasso di prelievo</strong> — Con il 3,5% anziché il 4%, il moltiplicatore sale da 25 a 28,6. Più sicuro ma richiede più tempo.</li>
<li><strong>L'orizzonte temporale</strong> — Se hai 35 anni e il FIRE a 50, devi finanziare potenzialmente 45-50 anni di spese. Se hai 50 anni con pensione INPS a 67, sono "solo" 17 anni.</li>
<li><strong>La pensione INPS</strong> — Dal momento in cui la riceverai, le tue spese da coprire con il portafoglio diminuiscono drasticamente. Questo riduce il patrimonio necessario.</li>
</ul>

<div class="example">
<strong>Esempio con pensione INPS:</strong><br>
Spese annuali: 24.000€. FIRE Number base: 600.000€.<br>
Ma a 67 anni riceverai 1.200€/mese di pensione INPS (14.400€/anno).<br>
Spese da coprire dopo i 67: solo 9.600€/anno → servono solo 240.000€ per quella fase.<br>
Questo significa che prima dei 67 devi finanziare un "gap" con il portafoglio, e dopo i 67 serve molto meno. Il calcolatore dell'app tiene conto di questo.
</div>

<div class="tip">
<strong>Come il calcolatore gestisce il FIRE Number con pensione INPS e rendite passive:</strong> la pensione INPS arriva a 67 anni, ma spesso il FIRE avviene prima. Inoltre molti italiani hanno <em>altri redditi</em> (affitti, dividendi) che continuano in FIRE. Il calcolatore distingue tre casi e sottrae sempre il valore attuale (PV) degli altri redditi:
<ul>
<li><strong>FIRE dopo l'età pensionabile (retirementAge ≥ pensionAge):</strong> la pensione è già attiva. FIRE Number = (Spese − Pensione annua) / SWR − PV(altri redditi)</li>
<li><strong>Nessuna pensione INPS indicata:</strong> FIRE Number classico = Spese / SWR − PV(altri redditi)</li>
<li><strong>FIRE prima della pensione INPS (caso più comune):</strong> il portafoglio deve coprire due fasi distinte — "bridge years" con spese piene (dal FIRE ai 67) + fase post-pensione con solo il gap residuo (67 → aspettativa di vita) − PV(altri redditi attivi nel periodo). Il calcolatore usa il <strong>valore attuale</strong> delle rendite scontate al rendimento reale.</li>
</ul>
<strong>Esempio realistico:</strong> utente 45 anni, FIRE a 55, pensione INPS 866€/mese a 67, spese 15.000€/anno, affitto netto 15.000€/anno (perpetuo), rendimento reale 5%.
<ul>
<li>Ponte 12 anni (55 → 67) a spese piene 15.000 € → PV ≈ 133.000 €</li>
<li>Post-pensione 18 anni (67 → 85) a spese ridotte 3.742 € → PV ≈ 24.400 € al FIRE</li>
<li>Meno PV affitti 30 anni (55 → 85) a 15.000 € → PV ≈ 230.600 €</li>
<li><strong>FIRE Number totale ≈ 0 €</strong>: l'affitto copre da solo tutte le spese. In pratica sei già in FIRE con quel flusso passivo.</li>
</ul>
Se il numero ti sembra troppo basso o troppo alto, verifica <em>Profilo → Pensione</em> (stima e età pensionabile), <em>Profilo → Reddito</em> (altri redditi e loro durata), e l'età di FIRE nel pannello "Esplora Scenari" del calcolatore.
</div>

<div class="tip">
<strong>Patrimonio liquido vs illiquido:</strong> nel tab <em>Profilo → Patrimonio</em> gli asset sono divisi in due gruppi. Solo i <strong>liquidi</strong> (ETF, azioni, obbligazioni, cash, oro, cripto, fondo pensione) entrano nel calcolo del FIRE Number perché sono prelevabili al 4%. Gli <strong>illiquidi</strong> (immobili, TFR) non vengono inclusi: producono reddito (che va in "Altri redditi") o hanno vincoli di prelievo. Questo evita il doppio conteggio classico: se conti il valore di un immobile come "patrimonio da prelevare" E il suo affitto come reddito, stai sommando due benefici dello stesso asset.
</div>

<div class="tip">
<strong>Consiglio:</strong> Calcola il FIRE Number con diversi scenari: ottimistico (spese basse, rendimenti buoni), realistico (spese medie, rendimenti storici), pessimistico (spese alte, rendimenti bassi). Il tuo piano dovrebbe funzionare anche nello scenario pessimistico.
</div>

<div class="warning">
<strong>Attenzione:</strong> Il FIRE Number calcolato oggi dovrà essere aggiustato per l'inflazione. Se oggi servono 600.000€ e prevedi di raggiungerli tra 15 anni con un'inflazione media del 2%, il numero target in euro futuri sarà circa 807.000€. Il calcolatore dell'app gestisce questo automaticamente.
</div>
`
	},

	{
		id: 'tasso-risparmio',
		number: 4,
		title: 'Il Tasso di Risparmio',
		category: 'Fondamenti',
		icon: '💰',
		summary:
			"La leva più potente per il FIRE: come il tasso di risparmio determina il tempo necessario per raggiungerlo.",
		content: `
<h3>La Variabile Che Conta Più di Tutte</h3>
<p>Il <strong>tasso di risparmio</strong> è la percentuale del tuo reddito netto che investi ogni mese. È la singola variabile più importante nel percorso FIRE, molto più dei rendimenti di mercato o della scelta degli strumenti finanziari.</p>

<p><strong>Tasso di Risparmio = (Reddito Netto - Spese) / Reddito Netto × 100</strong></p>

<p>Perché è così cruciale? Perché agisce in <strong>due direzioni contemporaneamente</strong>: un tasso di risparmio più alto significa che risparmi di più (raggiungi il FIRE Number prima) E che spendi di meno (il FIRE Number stesso è più basso).</p>

<h3>Tasso di Risparmio vs Anni al FIRE</h3>
<p>Ecco la relazione approssimativa (assumendo rendimenti reali del 5% e partenza da zero):</p>

<ul>
<li><strong>10%</strong> di risparmio → circa <strong>51 anni</strong> al FIRE</li>
<li><strong>20%</strong> di risparmio → circa <strong>37 anni</strong></li>
<li><strong>30%</strong> di risparmio → circa <strong>28 anni</strong></li>
<li><strong>40%</strong> di risparmio → circa <strong>22 anni</strong></li>
<li><strong>50%</strong> di risparmio → circa <strong>17 anni</strong></li>
<li><strong>60%</strong> di risparmio → circa <strong>12,5 anni</strong></li>
<li><strong>70%</strong> di risparmio → circa <strong>8,5 anni</strong></li>
<li><strong>80%</strong> di risparmio → circa <strong>5,5 anni</strong></li>
</ul>

<p>Nota come la relazione è <strong>non lineare</strong>: passare dal 10% al 20% fa guadagnare 14 anni, mentre passare dal 70% all'80% ne fa guadagnare solo 3. I primi incrementi contano enormemente.</p>

<h3>Tasso di Risparmio degli Italiani</h3>
<p>La media italiana del tasso di risparmio è circa il <strong>8-12%</strong> del reddito disponibile (dato Istat/Eurostat). Per aspirare al FIRE serve almeno il 30-50%, che richiede scelte consapevoli e spesso controcorrente.</p>

<div class="example">
<strong>Esempio concreto:</strong><br>
Giovanni e Maria, coppia a Torino. Redditi netti combinati: 3.800€/mese.<br><br>
<strong>Scenario A (risparmio 20% = 760€/mese):</strong><br>
Spese: 3.040€/mese = 36.480€/anno. FIRE Number: 912.000€.<br>
Tempo al FIRE: ~37 anni (troppo!)<br><br>
<strong>Scenario B (risparmio 50% = 1.900€/mese):</strong><br>
Spese: 1.900€/mese = 22.800€/anno. FIRE Number: 570.000€.<br>
Tempo al FIRE: ~17 anni (molto meglio!)<br><br>
La differenza? Il FIRE Number è sceso di 342.000€ E il risparmio mensile è più che raddoppiato. L'effetto combinato è devastante (in senso positivo).
</div>

<h3>Come Aumentare il Tasso di Risparmio</h3>
<p>Ci sono due strade, e idealmente le percorri entrambe:</p>

<h3>1. Ridurre le Spese (Più Veloce)</h3>
<ul>
<li><strong>Abitazione</strong> — La voce più grande. Considera coinquilini, zone meno costose, negoziare l'affitto, o mutuo con rata più bassa (durata più lunga ma rata investibile).</li>
<li><strong>Auto</strong> — In molte città italiane un'auto costa 300-500€/mese tra rata, assicurazione, bollo, benzina, manutenzione, parcheggio. Valuta trasporto pubblico, bici, car sharing.</li>
<li><strong>Alimentari</strong> — Cucinare in casa, pianificare i pasti, discount (Lidl, Eurospin), offerte. Una famiglia può risparmiare 200-300€/mese.</li>
<li><strong>Abbonamenti</strong> — Rivedi tutti gli abbonamenti: servono davvero 3 piattaforme di streaming? La palestra la usi? Il piano telefonico è competitivo?</li>
<li><strong>Spese sociali</strong> — Non devi rinunciare alla vita sociale, ma un aperitivo a casa costa 5€ invece di 15€ al bar. Una cena cucinata insieme è più divertente del ristorante.</li>
</ul>

<h3>2. Aumentare il Reddito (Più Impattante)</h3>
<ul>
<li><strong>Negoziare lo stipendio</strong> — In Italia si negozia poco, ma un aumento del 10% va direttamente al risparmio se non alzi il tenore di vita.</li>
<li><strong>Cambiare lavoro</strong> — Spesso il modo più rapido per un aumento significativo (20-30%).</li>
<li><strong>Freelancing / side hustle</strong> — Lezioni private, consulenze, progetti freelance. Attenzione alla gestione fiscale (partita IVA o prestazione occasionale sotto 5.000€).</li>
<li><strong>Investire in competenze</strong> — Certificazioni, corsi, master che portano a promozioni o cambio settore.</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Il modo migliore per aumentare il risparmio è automatizzarlo. Imposta un bonifico automatico il giorno dopo lo stipendio verso il conto di investimento. Quello che non vedi, non lo spendi. Si chiama "pay yourself first" (paga te stesso per primo).
</div>

<div class="warning">
<strong>Attenzione:</strong> Non sacrificare la qualità della vita al punto da essere infelice. Un tasso di risparmio del 70% che ti rende miserable non è sostenibile. Trova il tuo equilibrio. Meglio un 40% mantenuto per 20 anni che un 70% abbandonato dopo 2 anni.
</div>
`
	},

	// ============================================================
	// CATEGORY: Calcoli e Simulazioni (Steps 5-10)
	// ============================================================
	{
		id: 'asset-allocation',
		number: 5,
		title: 'Asset Allocation',
		category: 'Calcoli e Simulazioni',
		icon: '📊',
		summary:
			"Come distribuire il patrimonio tra azioni, obbligazioni e altri asset. Prospettiva italiana con ETF, BTP e fondi.",
		content: `
<h3>La Distribuzione del Patrimonio</h3>
<p>L'<strong>asset allocation</strong> è la suddivisione del tuo patrimonio tra diverse classi di investimento. È responsabile di oltre il 90% della variabilità dei rendimenti a lungo termine, secondo lo studio classico di Brinson, Hood e Beebower. In altre parole, conta molto di più come dividi il portafoglio che quali singoli titoli scegli.</p>

<h3>Le Classi di Investimento Principali</h3>

<ul>
<li><strong>Azioni (Equity)</strong> — Rendimento storico reale (al netto dell'inflazione) circa 5-7% annuo. Alta volatilità (possono perdere 40-50% in un anno). Essenziali per la crescita a lungo termine. Tassazione in Italia: 26% su capital gain e dividendi.</li>
<li><strong>Obbligazioni (Bond)</strong> — Rendimento storico reale 1-3%. Bassa volatilità. Fungono da stabilizzatore del portafoglio. BTP e titoli di Stato italiani/europei tassati al 12,5%. Obbligazioni corporate al 26%.</li>
<li><strong>Liquidità</strong> — Conti deposito, BOT. Rendimento basso ma rischio minimo. Essenziale per il fondo di emergenza.</li>
<li><strong>Immobili</strong> — Rendimento variabile. Poca liquidità. Trattati nel capitolo dedicato.</li>
<li><strong>Materie prime / Oro</strong> — Protezione dall'inflazione, decorrelazione. Tipicamente 5-10% del portafoglio.</li>
</ul>

<h3>Regole Pratiche per l'Asset Allocation</h3>
<p>La regola tradizionale suggerisce:</p>
<p><strong>% in obbligazioni = Età</strong> (quindi a 30 anni: 30% obbligazioni, 70% azioni)</p>
<p>Ma per chi punta al FIRE, questa regola è troppo conservativa. Con un orizzonte di 30-50 anni, servono più azioni:</p>

<ul>
<li><strong>Fase di accumulo (lontani dal FIRE)</strong>: 80-100% azioni, 0-20% obbligazioni</li>
<li><strong>Vicino al FIRE (5-10 anni)</strong>: 70-80% azioni, 20-30% obbligazioni</li>
<li><strong>In FIRE (primi 5 anni)</strong>: 60-70% azioni, 25-35% obbligazioni, 5% liquidità</li>
<li><strong>FIRE consolidato</strong>: 60% azioni, 35% obbligazioni, 5% liquidità</li>
</ul>

<h3>Gli ETF per l'Investitore FIRE Italiano</h3>
<p>Gli ETF (Exchange Traded Fund) sono lo strumento ideale per il FIRE: bassi costi, diversificazione immediata, facili da comprare.</p>

<p><strong>ETF Azionari principali:</strong></p>
<ul>
<li><strong>VWCE</strong> (Vanguard FTSE All-World) — Il mondo intero in un ETF. TER 0,22%. La scelta più semplice e popolare.</li>
<li><strong>SWDA</strong> (iShares MSCI World) — Paesi sviluppati. TER 0,20%. Da abbinare a un emergenti.</li>
<li><strong>EIMI</strong> (iShares MSCI EM) — Mercati emergenti. TER 0,18%.</li>
</ul>

<p><strong>ETF Obbligazionari:</strong></p>
<ul>
<li><strong>AGGH</strong> (iShares Global Aggregate Bond) — Obbligazioni globali. TER 0,10%.</li>
<li><strong>XGLE</strong> (Xtrackers Eurozone Gov Bond) — Titoli di Stato area euro. Vantaggio fiscale (12,5% sulla quota di titoli di Stato).</li>
</ul>

<div class="example">
<strong>Portafoglio tipo "Lazy" per FIRE italiano in accumulo:</strong><br>
— 80% VWCE (azionario globale)<br>
— 20% AGGH o XGLE (obbligazionario)<br><br>
<strong>Costo totale</strong>: circa 0,20% annuo (TER).<br>
<strong>PAC mensile</strong> su Directa o Fineco: commissioni 0€ su ETF selezionati.
</div>

<h3>Accumulazione vs Distribuzione</h3>
<p>Per la fase di accumulo, preferisci ETF ad <strong>accumulazione</strong> (che reinvestono i dividendi automaticamente). Vantaggi:</p>
<ul>
<li>Non paghi il 26% sui dividendi ogni anno</li>
<li>Effetto compounding più efficiente</li>
<li>Meno operazioni e dichiarazioni fiscali</li>
</ul>
<p>In fase di FIRE, gli ETF a <strong>distribuzione</strong> possono essere utili per avere un flusso di cassa regolare senza vendere quote.</p>

<div class="tip">
<strong>Consiglio:</strong> La semplicità è la chiave. Un portafoglio con 1-3 ETF è sufficiente. Ogni ETF aggiuntivo aggiunge complessità senza migliorare significativamente il risultato. Il "portafoglio perfetto" è quello che riesci a mantenere per 20 anni senza farti prendere dal panico.
</div>

<div class="warning">
<strong>Attenzione:</strong> Il "home bias" è un errore comune: investire troppo in azioni italiane perché le conosci. L'Italia rappresenta meno del 1% del mercato azionario globale. Un portafoglio concentrato sull'Italia è un rischio non ricompensato. Diversifica globalmente.
</div>
`
	},

	{
		id: 'regola-del-4-percento',
		number: 6,
		title: 'La Regola del 4%',
		category: 'Calcoli e Simulazioni',
		icon: '📐',
		summary:
			"Il Trinity Study spiegato: origini, funzionamento, limiti e adattamento al contesto fiscale italiano.",
		appLink: '/calcolatore/',
		appLinkLabel: 'Usa il Calcolatore FIRE',
		content: `
<h3>L'Origine: Il Trinity Study</h3>
<p>La <strong>regola del 4%</strong> nasce dal celebre "Trinity Study" del 1998, condotto dai professori Cooley, Hubbard e Walz della Trinity University. Lo studio analizzò i rendimenti storici del mercato americano dal 1926 al 1995 per rispondere a una domanda cruciale: <strong>quanto puoi prelevare ogni anno dal tuo portafoglio senza esaurirlo in 30 anni?</strong></p>

<p>La risposta: con un portafoglio 50% azioni / 50% obbligazioni, un tasso di prelievo del 4% (aggiustato annualmente per l'inflazione) aveva una probabilità di successo di circa il <strong>95%</strong> su 30 anni.</p>

<h3>Come Funziona in Pratica</h3>
<p>Il meccanismo è semplice:</p>
<ol>
<li>Il primo anno prelevi il 4% del patrimonio iniziale</li>
<li>Gli anni successivi, adegui l'importo all'inflazione (non ricalcoli il 4% del patrimonio corrente)</li>
</ol>

<div class="example">
<strong>Esempio:</strong><br>
Patrimonio al momento del FIRE: 600.000€<br>
Anno 1: prelevi 4% × 600.000€ = 24.000€ (2.000€/mese)<br>
Anno 2 (inflazione 2%): prelevi 24.000€ × 1,02 = 24.480€<br>
Anno 3 (inflazione 3%): prelevi 24.480€ × 1,03 = 25.214€<br>
E così via, indipendentemente dall'andamento del mercato.
</div>

<h3>Perché Funziona (e Quando Non Funziona)</h3>
<p>Funziona perché storicamente i mercati azionari hanno reso molto più del 4% reale. Il margine extra copre gli anni negativi. Ma ci sono limitazioni importanti:</p>

<ul>
<li><strong>Basata su dati USA</strong> — Il mercato americano è stato il più performante del XX secolo. Altri mercati (Italia inclusa!) hanno avuto rendimenti inferiori.</li>
<li><strong>30 anni, non 50</strong> — Lo studio originale copre 30 anni. Se vai in pensione a 40, ti servono 50+ anni di prelievi. Con orizzonti più lunghi, il 3,5% è più sicuro.</li>
<li><strong>95%, non 100%</strong> — C'è un 5% di scenari storici in cui il 4% fallisce, tipicamente quando i primi anni di pensionamento coincidono con un mercato orso prolungato.</li>
<li><strong>Non considera le tasse</strong> — Il 4% è lordo. In Italia, con il 26% sui capital gain, il prelievo netto effettivo potrebbe essere inferiore.</li>
</ul>

<h3>Il 4% nel Contesto Italiano</h3>
<p>Per un investitore italiano, il 4% richiede degli aggiustamenti:</p>

<ul>
<li><strong>Tassazione al 26%</strong> sui rendimenti da ETF azionari e obbligazioni corporate. Se prelevi 24.000€ e una parte è capital gain, paghi il 26% su quella parte. Il vantaggio è che la parte di prelievo che è "restituzione di capitale" non è tassata.</li>
<li><strong>BTP al 12,5%</strong> — Una quota in BTP riduce il carico fiscale complessivo.</li>
<li><strong>Fondi pensione</strong> — Tassazione agevolata dal 9% al 15%. Usarli in modo strategico riduce l'impatto fiscale.</li>
</ul>

<div class="example">
<strong>Esempio fiscale:</strong><br>
Patrimonio: 600.000€ investiti al 100% in ETF azionari.<br>
Prelievo annuo lordo al 4%: 24.000€.<br>
Se il costo medio delle quote è 400.000€ e il valore attuale è 600.000€, il rapporto capital gain/prelievo è circa il 33%.<br>
Tasse: 24.000€ × 33% × 26% = 2.059€<br>
Prelievo netto: 24.000€ - 2.059€ = <strong>21.941€</strong><br><br>
Per avere 24.000€ netti, serve prelevare circa 26.400€ lordi → tasso effettivo ~4,4%.
</div>

<h3>Alternative al 4%</h3>
<p>Molti esperti suggeriscono variazioni più sicure:</p>
<ul>
<li><strong>3,5%</strong> — Più sicuro per orizzonti lunghi (40-50 anni). Moltiplicatore: 28,6</li>
<li><strong>3,25%</strong> — Suggerito da Wade Pfau per gli scenari internazionali. Moltiplicatore: 30,8</li>
<li><strong>VPW (Variable Percentage Withdrawal)</strong> — Tasso variabile basato sull'età e il patrimonio residuo</li>
<li><strong>Guardrails di Guyton-Klinger</strong> — Regole di aggiustamento dinamico basate sull'andamento del mercato</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Usa il 4% come punto di partenza per i calcoli, ma pianifica con il 3,5% se vuoi dormire tranquillo. La differenza sul FIRE Number è significativa (600.000€ vs 685.000€ con spese di 24.000€/anno) ma il margine di sicurezza addizionale vale l'attesa extra.
</div>

<div class="warning">
<strong>Attenzione:</strong> Non trattare la regola del 4% come un dogma. È una stima basata su dati storici, non una garanzia. Il futuro potrebbe avere rendimenti inferiori alla media storica. Per questo è fondamentale avere un piano di backup: riduzione delle spese, reddito part-time, flessibilità.
</div>
`
	},

	{
		id: 'strategie-prelievo',
		number: 7,
		title: 'Strategie di Prelievo Avanzate',
		category: 'Calcoli e Simulazioni',
		icon: '🔄',
		summary:
			"Oltre la regola del 4%: VPW, Guyton-Klinger, CAPE-based. Pro e contro di ogni strategia.",
		appLink: '/calcolatore/',
		appLinkLabel: 'Confronta le Strategie',
		content: `
<h3>Perché Andare Oltre il 4% Fisso</h3>
<p>La regola del 4% è rigida: prelevi lo stesso importo (aggiustato per inflazione) indipendentemente dall'andamento del mercato. Questo significa che dopo un crollo del 40% prelevi comunque la stessa cifra, accelerando l'esaurimento del portafoglio. Le strategie avanzate introducono <strong>flessibilità</strong> per aumentare la probabilità di successo.</p>

<h3>1. VPW — Variable Percentage Withdrawal</h3>
<p>Il VPW adatta il tasso di prelievo in base all'età e al patrimonio residuo. Ogni anno ricalcoli l'importo usando una tabella attuariale.</p>

<ul>
<li><strong>Come funziona:</strong> Ogni anno prelevi una percentuale del patrimonio corrente, calcolata in base alla tua aspettativa di vita rimanente e all'asset allocation.</li>
<li><strong>Pro:</strong> Non esaurisci mai il portafoglio (matematicamente impossibile). Si adatta automaticamente ai mercati.</li>
<li><strong>Contro:</strong> Il reddito varia ogni anno, anche significativamente. Dopo un crollo di mercato il prelievo si riduce del 30-40%.</li>
</ul>

<div class="example">
<strong>Esempio VPW:</strong><br>
Età 55, patrimonio 600.000€, allocation 60/40.<br>
Percentuale VPW per età 55: circa 4,4%.<br>
Prelievo anno 1: 600.000€ × 4,4% = 26.400€<br><br>
Anno 2: mercato scende, patrimonio 510.000€. Età 56, percentuale 4,5%.<br>
Prelievo anno 2: 510.000€ × 4,5% = 22.950€ (calo del 13%)<br><br>
Anno 3: mercato risale, patrimonio 620.000€. Età 57, percentuale 4,6%.<br>
Prelievo anno 3: 620.000€ × 4,6% = 28.520€
</div>

<h3>2. Guardrails di Guyton-Klinger</h3>
<p>Questa strategia parte dal 4% fisso ma aggiunge "guardrails" (barriere di protezione):</p>

<ul>
<li><strong>Regola del Prosperità:</strong> Se il tasso di prelievo attuale scende sotto il 20% del tasso iniziale (cioè il portafoglio è cresciuto molto), aumenti il prelievo del 10%.</li>
<li><strong>Regola del Capitale:</strong> Se il tasso di prelievo attuale sale oltre il 20% del tasso iniziale (il portafoglio è sceso), riduci il prelievo del 10%.</li>
<li><strong>Regola dell'Inflazione:</strong> Non adegui per l'inflazione negli anni in cui il portafoglio ha reso negativamente.</li>
</ul>

<div class="example">
<strong>Esempio Guyton-Klinger:</strong><br>
Patrimonio iniziale: 600.000€. Tasso iniziale: 4% = 24.000€/anno.<br>
"Guardrail superiore": se il tasso corrente scende sotto 3,2% (portafoglio > 750.000€), aumenti a 26.400€.<br>
"Guardrail inferiore": se il tasso corrente sale sopra 4,8% (portafoglio < 500.000€), riduci a 21.600€.<br><br>
Dopo un anno negativo con inflazione al 3%: NON adegui per l'inflazione. Resti a 24.000€ anziché salire a 24.720€.
</div>

<h3>3. Strategia CAPE-Based</h3>
<p>Il tasso di prelievo si adatta al <strong>CAPE Ratio</strong> (Cyclically Adjusted Price-to-Earnings) del mercato:</p>
<ul>
<li>CAPE alto (mercato caro, >25) → tasso di prelievo più basso (3,0-3,5%)</li>
<li>CAPE medio (15-25) → tasso standard (3,5-4,0%)</li>
<li>CAPE basso (mercato a sconto, <15) → tasso più alto (4,0-5,0%)</li>
</ul>

<p>Il razionale è che i rendimenti futuri tendono a essere inversamente correlati al CAPE: comprare caro porta rendimenti bassi, comprare a sconto porta rendimenti alti.</p>

<h3>4. Floor-and-Ceiling (Pavimento e Soffitto)</h3>
<p>Combina la flessibilità del VPW con la prevedibilità del 4% fisso:</p>
<ul>
<li>Calcola il prelievo come % del patrimonio corrente</li>
<li>Ma imponi un <strong>minimo</strong> (es. 80% del prelievo iniziale) e un <strong>massimo</strong> (es. 120%)</li>
<li>Il reddito varia ma entro limiti gestibili</li>
</ul>

<h3>Quale Strategia Scegliere?</h3>
<ul>
<li><strong>4% fisso</strong> — Se vuoi semplicità e hai altre entrate di backup</li>
<li><strong>Guyton-Klinger</strong> — Se vuoi un buon compromesso tra semplicità e adattabilità</li>
<li><strong>VPW</strong> — Se accetti la variabilità e vuoi la massima efficienza matematica</li>
<li><strong>CAPE-based</strong> — Se vuoi adattarti alle condizioni di mercato</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Qualsiasi strategia tu scelga, la chiave è la <strong>flessibilità delle spese</strong>. Se riesci a ridurre le spese del 15-20% negli anni di mercato negativo, la probabilità di successo del tuo piano sale enormemente, indipendentemente dalla strategia di prelievo.
</div>

<div class="tip">
<strong>Prova la modalita "Esplora Scenari":</strong> Nel calcolatore FIRE trovi il pannello What If con slider su tutti i parametri (spese, portafoglio, eta FIRE target, pensione INPS, aspettativa di vita). Cambiando i valori il grafico si aggiorna in tempo reale, permettendoti di confrontare rapidamente l'impatto di ogni strategia e parametro.
</div>

<div class="warning">
<strong>Attenzione:</strong> Le strategie dinamiche funzionano meglio sulla carta che nella vita reale. Ridurre le spese del 10-15% durante un crollo di mercato richiede disciplina emotiva e spese effettivamente comprimibili. Pianifica in anticipo quali spese puoi tagliare nei periodi difficili.
</div>
`
	},

	{
		id: 'simulazioni-monte-carlo',
		number: 8,
		title: 'Simulazioni Monte Carlo',
		category: 'Calcoli e Simulazioni',
		icon: '🎲',
		summary:
			"Come funzionano le simulazioni Monte Carlo, come leggerle e quale tasso di successo puntare.",
		appLink: '/simulazione/',
		appLinkLabel: 'Esegui una Simulazione',
		content: `
<h3>Cosa Sono le Simulazioni Monte Carlo</h3>
<p>Le simulazioni Monte Carlo sono uno strumento statistico che genera <strong>migliaia di scenari futuri possibili</strong> per il tuo portafoglio, basandosi sulla distribuzione storica dei rendimenti. Anziché darti un singolo risultato ("il tuo portafoglio crescerà del 7% l'anno"), ti mostrano l'intera gamma di possibilità, dalla migliore alla peggiore.</p>

<p>Il nome viene dal casinò di Monte Carlo: come alla roulette, ogni "lancio" è casuale ma segue regole statistiche note. Dopo migliaia di lanci, emerge un quadro completo delle probabilità.</p>

<h3>Come Funzionano</h3>
<p>La simulazione segue questi passaggi:</p>
<ol>
<li><strong>Definisci i parametri:</strong> patrimonio iniziale, contributi annuali, spese in FIRE, asset allocation, orizzonte temporale</li>
<li><strong>Per ogni simulazione (es. 10.000):</strong> il computer estrae rendimenti casuali dalla distribuzione storica per ogni anno</li>
<li><strong>Simula il portafoglio:</strong> applicando rendimenti, contributi, prelievi e tasse anno per anno</li>
<li><strong>Conta i successi:</strong> in quante simulazioni il portafoglio non si esaurisce?</li>
</ol>

<h3>Come Leggere i Risultati</h3>
<p>I risultati tipici di una simulazione Monte Carlo includono:</p>

<ul>
<li><strong>Tasso di successo</strong> — Percentuale di simulazioni in cui il portafoglio sopravvive per tutto l'orizzonte temporale. Es: "93% di successo su 40 anni".</li>
<li><strong>Distribuzione dei risultati</strong> — Grafico a ventaglio che mostra il patrimonio nel tempo per diversi percentili (10°, 25°, 50°, 75°, 90°).</li>
<li><strong>Worst case</strong> — Lo scenario peggiore: quanto è sceso il portafoglio nel caso più sfortunato?</li>
<li><strong>Patrimonio mediano finale</strong> — Nel 50% dei casi, quanto resta alla fine?</li>
</ul>

<div class="example">
<strong>Come interpretare:</strong><br>
Simulazione con 600.000€, prelievo 24.000€/anno, 60/40, 40 anni:<br>
— Tasso di successo: <strong>91%</strong><br>
— Patrimonio mediano a 40 anni: <strong>820.000€</strong> (nel caso tipico, il portafoglio cresce!)<br>
— 10° percentile a 40 anni: <strong>-42.000€</strong> (in 1 caso su 10, il portafoglio si esaurisce prima)<br>
— 90° percentile a 40 anni: <strong>2.400.000€</strong> (nel 10% migliore, diventi ricco)<br><br>
Questo significa che nella maggior parte dei casi il piano funziona, ma c'è un rischio non trascurabile di fallimento.
</div>

<h3>Quale Tasso di Successo Puntare?</h3>
<p>La risposta dipende dalla tua flessibilità:</p>

<ul>
<li><strong>80-85%</strong> — Accettabile se hai flessibilità di spesa (puoi tagliare 20%+), una pensione INPS in arrivo, o disponibilità a lavorare part-time</li>
<li><strong>90-95%</strong> — Obiettivo ragionevole per la maggior parte delle persone FIRE</li>
<li><strong>95-99%</strong> — Molto sicuro, ma richiede un patrimonio significativamente maggiore. Il costo opportunità è lavorare anni in più.</li>
<li><strong>100%</strong> — Impossibile da garantire. Non inseguire la certezza assoluta.</li>
</ul>

<h3>Modalita Multi-Asset</h3>
<p>L'app supporta simulazioni con <strong>3 o piu classi di asset</strong> (azioni, obbligazioni, oro, cash, immobiliare) con una <strong>matrice di correlazione completa</strong>. Attiva la "Modalita avanzata" nella pagina simulazione per configurare piu classi, impostare le allocazioni e visualizzare la matrice di correlazione storica.</p>

<p>Questa funzionalita usa la <strong>decomposizione di Cholesky</strong> per generare rendimenti correlati tra tutte le classi di asset, producendo risultati piu realistici rispetto alla semplice media ponderata.</p>

<h3>Limiti delle Simulazioni Monte Carlo</h3>
<p>Le simulazioni non sono perfette:</p>
<ul>
<li><strong>Basate sul passato</strong> — Assumono che il futuro assomigli al passato. I "cigni neri" (eventi mai visti) non sono catturati.</li>
<li><strong>Distribuzione dei rendimenti</strong> — Usano tipicamente una distribuzione normale, ma i rendimenti reali hanno "code grasse" (eventi estremi più frequenti del previsto).</li>
<li><strong>Correlazione temporale</strong> — I rendimenti non sono completamente indipendenti anno per anno. I mercati hanno "regimi" di crescita e contrazione.</li>
<li><strong>Parametri fissi</strong> — Assumono che spese, tasse e contributi restino costanti, ma nella vita reale cambiano.</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Usa le simulazioni Monte Carlo come uno strumento, non come un oracolo. Esegui la simulazione con diversi scenari: cambia le spese, il tasso di prelievo, l'asset allocation. Guarda come cambia il tasso di successo. Il vero valore è capire la <strong>sensibilità</strong> del tuo piano ai diversi parametri.
</div>

<div class="warning">
<strong>Attenzione:</strong> Un tasso di successo del 95% NON significa che hai il 95% di probabilità di successo nel mondo reale. Significa che il 95% degli scenari storici simulati ha funzionato. Il futuro potrebbe essere diverso dal passato. Mantieni sempre un margine di sicurezza e un piano B.
</div>
`
	},

	{
		id: 'rischio-sequenza-rendimenti',
		number: 9,
		title: 'Rischio Sequenza dei Rendimenti',
		category: 'Calcoli e Simulazioni',
		icon: '📉',
		summary:
			"Il rischio numero uno per chi va in FIRE: come i rendimenti dei primi anni possono fare o rompere il tuo piano.",
		content: `
<h3>Il Rischio Più Insidioso</h3>
<p>Il <strong>rischio sequenza dei rendimenti</strong> (Sequence of Returns Risk) è il fatto che l'<strong>ordine</strong> in cui si verificano i rendimenti conta enormemente quando stai prelevando dal portafoglio. Due persone con lo stesso rendimento medio su 30 anni possono avere risultati radicalmente diversi se una ha rendimenti negativi all'inizio e l'altra alla fine.</p>

<p>In fase di accumulo questo rischio non esiste: se il mercato crolla mentre stai investendo, stai comprando a sconto. Ma in fase di decumulo (prelievo), un crollo nei primi 3-5 anni è devastante perché stai vendendo a prezzi bassi per finanziare le spese, riducendo il capitale che dovrebbe generare la ripresa successiva.</p>

<div class="example">
<strong>Esempio drammatico:</strong><br><br>
<strong>Scenario A</strong> — Rendimenti: +20%, +15%, +10%, -30%, -20% (media: -1%/anno)<br>
Portafoglio 600.000€, prelievo 24.000€/anno:<br>
Anno 1: 600K × 1,20 - 24K = 696K<br>
Anno 2: 696K × 1,15 - 24K = 776K<br>
Anno 3: 776K × 1,10 - 24K = 830K<br>
Anno 4: 830K × 0,70 - 24K = 557K<br>
Anno 5: 557K × 0,80 - 24K = <strong>422K</strong><br><br>

<strong>Scenario B</strong> — Stessi rendimenti in ordine inverso: -20%, -30%, +10%, +15%, +20%<br>
Anno 1: 600K × 0,80 - 24K = 456K<br>
Anno 2: 456K × 0,70 - 24K = 295K<br>
Anno 3: 295K × 1,10 - 24K = 301K<br>
Anno 4: 301K × 1,15 - 24K = 322K<br>
Anno 5: 322K × 1,20 - 24K = <strong>362K</strong><br><br>
Stessa media, <strong>60.000€ di differenza</strong>! E nello scenario B il portafoglio è entrato in una spirale pericolosa.
</div>

<h3>I Primi 5 Anni Sono Critici</h3>
<p>Gli studi dimostrano che i rendimenti dei <strong>primi 5-10 anni</strong> di pensionamento determinano in larga misura il successo o il fallimento del piano. Se il mercato è favorevole all'inizio, il portafoglio acquista un "cuscinetto" che lo rende resiliente anche a crolli successivi. Se il mercato crolla all'inizio, il portafoglio potrebbe non riprendersi mai.</p>

<h3>Strategie di Protezione</h3>

<h3>1. Il Bond Tent (Tenda Obbligazionaria)</h3>
<p>Aumenta la quota obbligazionaria nei 5 anni prima e dopo il FIRE, poi riducila gradualmente:</p>
<ul>
<li>5 anni prima del FIRE: passa da 80/20 a 60/40</li>
<li>Al momento del FIRE: 50/50 o 40/60</li>
<li>Nei 10 anni successivi: torna gradualmente a 60/40 o 70/30</li>
</ul>
<p>Questo riduce la volatilità nel periodo più critico.</p>

<h3>2. Cash Buffer (Cuscinetto di Liquidità)</h3>
<p>Mantieni 2-3 anni di spese in liquidità (conti deposito, BOT). Quando il mercato crolla, prelevi dalla liquidità anziché vendere investimenti in perdita. Quando il mercato sale, ripristini la liquidità.</p>

<div class="example">
<strong>Cash Buffer in pratica:</strong><br>
Spese annue: 24.000€. Cash buffer: 48.000€ (2 anni).<br>
Il mercato perde il 35% nel primo anno di FIRE.<br>
Invece di vendere ETF a -35%, usi il cash buffer per 1-2 anni.<br>
Quando il mercato si riprende (mediamente entro 2-3 anni), torni a prelevare dal portafoglio e ripristini il buffer.
</div>

<h3>3. Spesa Flessibile</h3>
<p>La strategia più potente: riduci le spese del 10-20% quando il mercato scende significativamente (>20%). In Italia questo potrebbe significare:</p>
<ul>
<li>Rinunciare alle vacanze costose per un anno</li>
<li>Ridurre le cene fuori</li>
<li>Rimandare acquisti non essenziali</li>
<li>Sfruttare di più la sanità pubblica anziché quella privata</li>
</ul>

<h3>4. Reddito Part-Time (BaristaFIRE)</h3>
<p>Avere la possibilità di guadagnare anche solo 500-1.000€/mese nei primi anni riduce enormemente il rischio sequenza. Non devi lavorare a tempo pieno: lezioni private, consulenze, hobby monetizzabili.</p>

<div class="tip">
<strong>Consiglio:</strong> La combinazione migliore è bond tent + cash buffer + flessibilità di spesa. Insieme, queste tre strategie possono aumentare il tasso di successo dal 90% al 98%+ anche con un tasso di prelievo del 4%.
</div>

<div class="warning">
<strong>Attenzione:</strong> Non fare FIRE in un anno di massimi storici di mercato senza protezioni. Se il CAPE ratio è sopra 30 e non hai un cash buffer, valuta di lavorare 1-2 anni in più o di iniziare con un tasso di prelievo più basso (3-3,5%).
</div>
`
	},

	{
		id: 'inflazione-potere-acquisto',
		number: 10,
		title: "Inflazione e Potere d'Acquisto",
		category: 'Calcoli e Simulazioni',
		icon: '📈',
		summary:
			"Come l'inflazione erode il patrimonio nel tempo. Lezioni dalla storia italiana e strategie di protezione.",
		content: `
<h3>Il Nemico Silenzioso</h3>
<p>L'inflazione è l'aumento generalizzato dei prezzi nel tempo. Con un'inflazione del 2% annuo, il potere d'acquisto di 1.000€ si dimezza in 35 anni. Con il 3%, in soli 23 anni. Per chi pianifica un pensionamento di 40-50 anni, l'inflazione è un rischio esistenziale.</p>

<p>24.000€ annui oggi, con un'inflazione media del 2%, equivarranno al potere d'acquisto di soli <strong>14.600€</strong> tra 25 anni e <strong>10.900€</strong> tra 40 anni.</p>

<h3>L'Inflazione in Italia: Una Storia Turbolenta</h3>
<p>L'Italia ha avuto periodi di inflazione estrema che gli italiani più giovani non ricordano:</p>

<ul>
<li><strong>Anni '70</strong> — Inflazione a due cifre: 12-21% annuo. Chi aveva risparmi in liquidità fu devastato.</li>
<li><strong>1980</strong> — Picco del 21,2%. I BOT rendevano il 16% ma il rendimento reale era negativo!</li>
<li><strong>Anni '90</strong> — Graduale discesa dal 6% al 2% con l'avvicinamento all'euro.</li>
<li><strong>2000-2020</strong> — Inflazione bassissima, spesso sotto l'1%. Ha creato una falsa sensazione di sicurezza.</li>
<li><strong>2022-2023</strong> — Ritorno brusco al 6-8%, shock per molti investitori e pensionati.</li>
</ul>

<div class="example">
<strong>L'impatto reale:</strong><br>
Una famiglia italiana che nel 1975 aveva 100 milioni di lire in un conto corrente, nel 1985 si ritrovava con un potere d'acquisto equivalente a circa 25 milioni. Il 75% del patrimonio era evaporato, pur avendo nominalmente lo stesso importo.
</div>

<h3>Come l'Inflazione Impatta il Piano FIRE</h3>
<p>L'inflazione agisce su tre livelli:</p>
<ol>
<li><strong>Aumenta le spese future</strong> — Le tue spese crescono ogni anno. 24.000€ oggi diventano 29.000€ tra 10 anni con inflazione al 2%.</li>
<li><strong>Riduce i rendimenti reali</strong> — Se il portafoglio rende il 7% nominale e l'inflazione è al 3%, il rendimento reale è solo il 4%.</li>
<li><strong>Alza il FIRE Number nel tempo</strong> — Se calcoli il FIRE Number oggi ma lo raggiungi tra 15 anni, l'inflazione lo avrà gonfiato significativamente.</li>
</ol>

<h3>Strategie di Protezione</h3>

<h3>1. Azioni come Protezione Naturale</h3>
<p>Le azioni sono la migliore protezione dall'inflazione a lungo termine. Le aziende aumentano i prezzi con l'inflazione, quindi i profitti (e i corsi azionari) tendono a salire. Rendimento storico reale delle azioni globali: circa 5-7% annuo, già al netto dell'inflazione.</p>

<h3>2. Obbligazioni Indicizzate all'Inflazione</h3>
<p>In Italia abbiamo strumenti specifici:</p>
<ul>
<li><strong>BTP Italia</strong> — Indicizzati all'inflazione italiana (FOI). Cedola reale + adeguamento del capitale. Tassazione agevolata al 12,5%.</li>
<li><strong>BTP€i</strong> — Indicizzati all'inflazione europea (HICP). Stessa tassazione agevolata.</li>
<li><strong>ETF su TIPS</strong> — Obbligazioni USA indicizzate all'inflazione. Tassazione al 26%.</li>
</ul>

<h3>3. Rendimenti Reali, Non Nominali</h3>
<p>Ragiona sempre in termini <strong>reali</strong> (al netto dell'inflazione). Se il tuo portafoglio rende il 7% nominale:</p>
<ul>
<li>Con inflazione 2%: rendimento reale ~5%</li>
<li>Con inflazione 4%: rendimento reale ~3%</li>
<li>Con inflazione 6%: rendimento reale ~1% (quasi nulla!)</li>
</ul>

<h3>4. Diversificazione Internazionale</h3>
<p>L'inflazione italiana potrebbe divergere da quella globale. Investire globalmente protegge da scenari di inflazione specificamente italiana (come negli anni '70).</p>

<div class="tip">
<strong>Come il calcolatore dell'app gestisce l'inflazione:</strong> il <strong>Calcolatore FIRE</strong> lavora in <em>termini nominali</em>. Inserisci il rendimento e l'inflazione separatamente come parametri. L'app:
<ul>
<li>Inflaziona automaticamente contributi, spese e pensione INPS anno per anno</li>
<li>Mostra una <strong>linea rossa "Target FIRE" crescente</strong> nel grafico: se l'inflazione è alta, il target "scappa" visibilmente verso l'alto</li>
<li>Calcola gli "Anni al FIRE" confrontando il portafoglio nominale con il target inflazionato dell'anno</li>
<li>Nel tooltip del grafico, quando l'inflazione è &gt; 0, trovi anche il valore del portafoglio convertito in <em>euro di oggi</em></li>
</ul>
Sposta lo slider <strong>Inflazione</strong> da 2% a 6% per vedere chiaramente l'impatto sulla sostenibilità del piano.
</div>

<div class="warning">
<strong>Attenzione al rendimento reale negativo:</strong> se il rendimento nominale è inferiore all'inflazione (es. 7% vs 10%), il potere d'acquisto del portafoglio <strong>diminuisce</strong> nel tempo anche se il valore nominale cresce. Il Coast FIRE in questi scenari diventa irraggiungibile senza nuovi contributi. Non sottovalutare l'inflazione settoriale: i costi sanitari tendono a crescere più dell'inflazione media, e l'energia può avere picchi improvvisi come nel 2022.
</div>
`
	},

	// ============================================================
	// CATEGORY: Fiscalità Italiana (Steps 11-14)
	// ============================================================
	{
		id: 'fiscalita-italiana',
		number: 11,
		title: 'Fiscalità Italiana per Investitori',
		category: 'Fiscalità Italiana',
		icon: '🏛️',
		summary:
			"Tutto sulla tassazione degli investimenti in Italia: regime amministrato vs dichiarativo, ETF, BTP, minus e plusvalenze.",
		appLink: '/calcolatore/',
		appLinkLabel: 'Calcola con le Tasse Italiane',
		content: `
<h3>Il Sistema Fiscale Italiano sugli Investimenti</h3>
<p>La fiscalità italiana sugli investimenti è complessa ma offre anche alcune opportunità. Capirla è fondamentale per ottimizzare il percorso FIRE. L'aliquota base è del <strong>26%</strong> su capital gain e dividendi, ma ci sono importanti eccezioni.</p>

<h3>Regime Amministrato vs Dichiarativo</h3>
<p><strong>Regime Amministrato</strong> (il più comune in Italia):</p>
<ul>
<li>Il broker/banca calcola e paga le tasse per te</li>
<li>Tassazione alla fonte su ogni operazione</li>
<li>Nessun obbligo dichiarativo aggiuntivo per i redditi da capitale</li>
<li>Gestione automatica delle minusvalenze (compensazione)</li>
<li>Broker italiani: Directa, Fineco, Banca Sella</li>
</ul>

<p><strong>Regime Dichiarativo</strong>:</p>
<ul>
<li>Tu calcoli e dichiari le tasse nel modello 730/Redditi PF</li>
<li>Tassazione posticipata al momento della dichiarazione</li>
<li>Necessario con broker esteri (Interactive Brokers, DEGIRO, Trade Republic)</li>
<li>Compilazione del quadro RW (monitoraggio fiscale), RT, RM, RL</li>
<li>Vantaggio: posticipo del pagamento. Svantaggio: complessità, rischio errori, costo commercialista (200-500€/anno)</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Per la maggior parte delle persone, il regime amministrato con un broker italiano come Directa è la scelta migliore. Commissioni competitive (0€ su molti ETF in PAC), nessuna complessità fiscale, compensazione automatica delle minusvalenze. Il risparmio di tempo e stress vale più di eventuali piccoli vantaggi del dichiarativo.
</div>

<h3>Tassazione per Tipo di Strumento</h3>

<p><strong>ETF e Fondi:</strong></p>
<ul>
<li>Capital gain: <strong>26%</strong></li>
<li>Dividendi: <strong>26%</strong></li>
<li><strong>IMPORTANTE:</strong> I capital gain degli ETF sono classificati come "redditi di capitale", NON come "redditi diversi". Questo significa che <strong>non possono compensare le minusvalenze</strong> generate da altri strumenti. È una delle peculiarità più penalizzanti della fiscalità italiana.</li>
<li>ETF con sottostante in titoli di Stato: parte del gain è tassata al 12,5% (il broker calcola la quota esatta)</li>
</ul>

<p><strong>Titoli di Stato (BTP, BOT, CTZ, CCT):</strong></p>
<ul>
<li>Cedole e capital gain: <strong>12,5%</strong></li>
<li>Questo vale per titoli di Stato italiani ed europei (white list)</li>
<li>Vantaggio enorme rispetto al 26%: su 10.000€ di gain, risparmi 1.350€</li>
</ul>

<p><strong>Azioni singole e obbligazioni corporate:</strong></p>
<ul>
<li>Capital gain: <strong>26%</strong> (classificato come "redditi diversi", può compensare minusvalenze)</li>
<li>Dividendi: <strong>26%</strong></li>
</ul>

<h3>Minusvalenze e Compensazione</h3>
<p>Le minusvalenze (perdite realizzate) possono essere usate per compensare le plusvalenze future, riducendo le tasse. Ma attenzione:</p>
<ul>
<li>Le minusvalenze scadono dopo <strong>4 anni</strong></li>
<li>Possono compensare solo "redditi diversi" (azioni, obbligazioni singole, certificati, ETC), <strong>NON redditi di capitale</strong> (ETF, fondi)</li>
<li>Questo è il motivo per cui vendere un ETF in perdita non genera minusvalenze utili per compensare futuri gain sugli ETF</li>
</ul>

<div class="example">
<strong>Esempio di inefficienza fiscale:</strong><br>
Hai una minusvalenza di 5.000€ da un'azione venduta in perdita.<br>
Vendi un ETF con 5.000€ di plusvalenza.<br>
Risultato: paghi comunque 1.300€ di tasse sull'ETF (26% di 5.000€). La minusvalenza dell'azione NON compensa il gain dell'ETF!<br><br>
Per compensare, dovresti vendere un'azione o un'obbligazione singola con 5.000€ di plusvalenza.
</div>

<div class="warning">
<strong>Attenzione:</strong> Se hai un broker estero (DEGIRO, Interactive Brokers, Trade Republic), sei obbligato al regime dichiarativo. Devi compilare il quadro RW per il monitoraggio fiscale anche se non hai fatto operazioni. La multa per omessa dichiarazione va dal 3% al 15% del valore degli investimenti. Non sottovalutare questo obbligo!
</div>
`
	},

	{
		id: 'fondi-pensione-tfr',
		number: 12,
		title: 'Fondi Pensione e TFR',
		category: 'Fiscalità Italiana',
		icon: '🏦',
		summary:
			"I vantaggi fiscali dei fondi pensione, le 5 nuove strategie di erogazione 2026 (rendita vitalizia, durata definita, prelievi liberi, frazionata, capitale 60%), TFR, RITA e extradeducibilità.",
		appLink: '/fondo-pensione/',
		appLinkLabel: 'Vai al Simulatore Fondo Pensione',
		content: `
<h3>Il Pilastro Nascosto del FIRE Italiano</h3>
<p>I <strong>fondi pensione complementari</strong> sono probabilmente lo strumento più sottovalutato dagli aspiranti FIRE italiani. Offrono vantaggi fiscali che nessun altro investimento può eguagliare, e possono essere una componente strategica fondamentale del piano di pensionamento anticipato.</p>

<h3>I Tre Vantaggi Fiscali</h3>

<h3>1. Deducibilità dei Contributi</h3>
<p>I contributi al fondo pensione (fino a <strong>5.300€ annui</strong>) sono deducibili dal reddito imponibile IRPEF. Il risparmio fiscale dipende dalla tua aliquota marginale:</p>
<ul>
<li>Aliquota marginale <strong>23%</strong> (redditi fino a 28.000€): risparmi <strong>1.219€/anno</strong></li>
<li>Aliquota marginale <strong>33%</strong> (redditi 28.000-50.000€): risparmi <strong>1.749€/anno</strong></li>
<li>Aliquota marginale <strong>43%</strong> (redditi oltre 50.000€): risparmi <strong>2.279€/anno</strong></li>
</ul>
<p>Questo è un rendimento immediato e garantito! Chi ha un'aliquota del 43% ottiene un "rendimento" istantaneo del 43% sul contributo.</p>

<h3>2. Tassazione Agevolata sui Rendimenti</h3>
<p>I rendimenti del fondo pensione sono tassati al <strong>20%</strong>, anziché il 26% standard. E la quota investita in titoli di Stato è tassata al 12,5%. Il risultato netto è una tassazione effettiva sui rendimenti di circa il <strong>15-18%</strong>.</p>

<h3>3. Tassazione Agevolata sulle Prestazioni</h3>
<p>Quando ricevi il capitale dal fondo pensione, la tassazione sulla parte di contributi dedotti è:</p>
<ul>
<li><strong>15%</strong> fino a 15 anni di partecipazione</li>
<li><strong>Riduzione dello 0,30%</strong> per ogni anno oltre il 15°, fino a un minimo del <strong>9%</strong> (dopo 35 anni)</li>
</ul>
<p>Confronta: contribuisci deducendo al 35-43%, e paghi il 9-15% in uscita. Il vantaggio netto è enorme.</p>

<div class="warning">
<strong>Attenzione alla base imponibile:</strong> il 15%-9% si applica <em>solo alla quota di contributi versati (dedotti) e al TFR conferito</em>, NON all'intero montante. I rendimenti maturati dal fondo durante l'accumulo sono gia' stati tassati al 20% annualmente e non subiscono ulteriore tassazione in uscita. Di conseguenza, a parita' di versamenti, <strong>rendita vitalizia, durata definita, prelievi liberi e capitale 60% pagano tutte lo stesso ammontare totale di tasse</strong>. Cambia solo la distribuzione temporale del prelievo, non l'onere fiscale complessivo. Il simulatore FIRE Planner richiede il campo "Contributi versati + TFR" proprio per calcolare correttamente questa frazione.
</div>

<div class="tip">
<strong>Rendita vitalizia: si rivaluta!</strong> In Italia la rendita vitalizia non e' fissa per tutta la vita. La compagnia assicurativa gestisce il capitale in una <em>gestione separata</em> e ogni anno rivaluta la rendita in base al rendimento realizzato, al netto di una trattenuta tipica dell'1-1,5%. Se il fondo rende il 3%, la rendita cresce di circa l'1,5-2% l'anno: non batte l'inflazione alta ma compensa in parte il potere d'acquisto. Il simulatore del FIRE Planner stima la rivalutazione usando <code>rendimento_atteso − 1,25%</code>; puoi vederla nel dettaglio anno per anno della strategia "Rendita Vitalizia".
</div>

<div class="example">
<strong>Esempio completo su 20 anni:</strong><br>
Contributo annuo: 5.300€. Aliquota marginale: 35%.<br><br>
<strong>Risparmio fiscale totale</strong>: 5.300€ × 35% × 20 anni = <strong>37.100€</strong><br>
<strong>Capitale versato</strong>: 5.300€ × 20 = 106.000€<br>
<strong>Con rendimento 5% netto di gestione</strong> (tassato al 20%): ~170.000€ circa<br>
<strong>Tassazione in uscita</strong> (dopo 20 anni → aliquota 13,5%): ~13.500€ sui contributi dedotti<br><br>
<strong>Risultato netto</strong>: ~156.500€, da un versamento effettivo (al netto del risparmio fiscale) di ~67.145€.<br>
<strong>Rendimento effettivo</strong>: molto superiore a qualsiasi investimento diretto!
</div>

<h3>Il TFR: Una Scelta Strategica</h3>
<p>Il <strong>TFR</strong> (Trattamento di Fine Rapporto) può restare in azienda o essere conferito al fondo pensione:</p>

<p><strong>TFR in azienda:</strong></p>
<ul>
<li>Rivalutazione: 75% dell'inflazione + 1,5% fisso</li>
<li>Tassazione: aliquota media IRPEF degli ultimi 5 anni (spesso 23-27%)</li>
<li>Disponibile al cambio/cessazione del rapporto di lavoro</li>
</ul>

<p><strong>TFR nel fondo pensione:</strong></p>
<ul>
<li>Rendimento dipendente dalla linea scelta (può essere superiore)</li>
<li>Tassazione sui rendimenti: 20% (vs IRPEF media)</li>
<li>Tassazione in uscita: 9-15% (vs aliquota media IRPEF)</li>
<li>Meno liquido: vincolato fino alla pensione (con eccezioni)</li>
</ul>

<h3>La RITA: Ponte verso la Pensione</h3>
<p>La <strong>RITA</strong> (Rendita Integrativa Temporanea Anticipata) è fondamentale per il FIRE. Permette di riscattare il fondo pensione anticipatamente:</p>
<ul>
<li><strong>5 anni prima</strong> della pensione di vecchiaia se hai perso il lavoro (anche volontariamente!) da almeno 24 mesi e hai almeno 20 anni di contribuzione</li>
<li><strong>10 anni prima</strong> della pensione se hai perso il lavoro da almeno 24 mesi</li>
<li>Tassazione: stessa aliquota agevolata del 9-15%</li>
</ul>

<h3>Extradeducibilità per Nuovi Lavoratori (Post-2007)</h3>
<p>Se il tuo <strong>primo impiego</strong> è iniziato dopo il 1° gennaio 2007, hai diritto a un'agevolazione aggiuntiva introdotta dalla Legge di Bilancio 2026:</p>
<ul>
<li><strong>Deduzione ordinaria</strong>: 5.300€/anno (per tutti)</li>
<li><strong>Extradeducibilità</strong>: fino a <strong>2.650€/anno</strong> in aggiunta (solo per lavoratori post-2007)</li>
<li><strong>Tetto massimo totale</strong>: <strong>7.950€/anno</strong></li>
</ul>

<p><strong>Come funziona:</strong></p>
<ul>
<li>Nei <strong>primi 5 anni</strong> di partecipazione al fondo pensione, se non hai utilizzato tutto il plafond di 5.300€/anno, la differenza si accumula come "credito"</li>
<li>Questo credito può essere <strong>recuperato nei 20 anni successivi</strong>, con un massimo aggiuntivo di 2.650€/anno</li>
<li>Il quinquennio utile decorre dalla data di <strong>primo impiego</strong>, non dall'iscrizione al fondo</li>
</ul>

<div class="example">
<strong>Esempio pratico:</strong><br>
Mario, primo impiego nel 2015 (post-2007), iscritto al fondo nel 2020.<br>
Nei primi 5 anni (2020-2024) ha versato in media 3.000€/anno.<br>
Plafond 5 anni: 5.164,57€ × 4 + 5.300€ × 1 = 25.958,28€<br>
Versato: 3.000€ × 5 = 15.000€<br>
<strong>Plafond inutilizzato</strong>: 10.958,28€<br><br>
Dal 2025 in poi, per i successivi 20 anni, Mario può dedurre fino a <strong>5.300€ + 548€ = 5.848€/anno</strong> (il plafond residuo spalmato su 20 anni), con un massimo extra di 2.650€/anno.<br>
</div>

<h3>Riforma 2026: Le 5 Modalità di Erogazione</h3>
<p>La <strong>Legge di Bilancio 2026</strong> (in vigore dal 1° luglio 2026) ha rivoluzionato le opzioni di erogazione del fondo pensione. Prima esistevano solo rendita vitalizia e capitale (max 50%). Ora le opzioni sono 5:</p>

<h3>1. Rendita Vitalizia (classica)</h3>
<p>L'opzione tradizionale: il capitale viene trasferito a una compagnia assicurativa che paga un assegno mensile <strong>a vita</strong>. L'importo dipende dall'età, dal genere e dalle tavole attuariali. La rendita si <strong>rivaluta annualmente</strong> in base al rendimento della gestione separata della compagnia (tipicamente rendimento gestione meno uno spread dell'1-1,5%).</p>
<ul>
<li><strong>Tassazione</strong>: 15% → 9% (scende dello 0,30%/anno dopo il 15° anno) sulla sola quota contributi+TFR; i rendimenti gia' tassati al 20% durante l'accumulo non vengono tassati di nuovo</li>
<li><strong>Pro</strong>: protezione dalla longevità, rivalutazione che compensa parte dell'inflazione</li>
<li><strong>Contro</strong>: il capitale esce dal fondo, nulla agli eredi al decesso (salvo reversibilita' al coniuge), rivalutazione spesso inferiore all'inflazione</li>
</ul>

<h3>2. Rendita a Durata Definita <span style="color: #3b82f6; font-size: 0.8em;">[NUOVA 2026]</span></h3>
<p>Il capitale <strong>resta nel fondo</strong> e continua a generare rendimenti. La rata annuale viene calcolata dividendo il montante per gli anni di vita residua secondo le tabelle ISTAT, e <strong>ricalcolata ogni anno</strong>.</p>
<ul>
<li><strong>Tassazione</strong>: 15% → 9% (identica alla vitalizia)</li>
<li><strong>Pro</strong>: capitale resta investito, rata si adegua, <strong>eredi ricevono il capitale residuo</strong></li>
<li><strong>Contro</strong>: importo variabile (dipende dai rendimenti del fondo)</li>
</ul>

<div class="example">
<strong>Esempio:</strong> Montante 200.000€ a 67 anni. Aspettativa di vita: 17,2 anni.<br>
Rata anno 1: 200.000€ / 17,2 = <strong>11.628€/anno</strong> (~893€/mese lordi).<br>
Se il fondo rende il 3% netto, a fine anno il capitale è ~194.372€. Rata anno 2: 194.372€ / 16,2 = 11.998€/anno.<br>
Se muori dopo 10 anni con 120.000€ residui → <strong>eredi ricevono 120.000€</strong>.
</div>

<h3>3. Prelievi Liberi <span style="color: #22c55e; font-size: 0.8em;">[NUOVA 2026 - IDEALE PER FIRE]</span></h3>
<p>La modalità più flessibile: <strong>prelevi quando vuoi e quanto vuoi</strong>, senza vincoli di rata fissa. Il tetto massimo cumulativo è pari alla somma delle rate virtuali che avresti ricevuto con la rendita a durata definita.</p>
<ul>
<li><strong>Tassazione</strong>: 15% → 9% (identica alla vitalizia)</li>
<li><strong>Pro</strong>: massima flessibilità, prelevi solo quando serve, capitale resta investito</li>
<li><strong>Contro</strong>: richiede disciplina (rischio di prelevare troppo presto)</li>
<li><strong>Perché è ideale per FIRE</strong>: puoi modulare i prelievi in base alle tue spese reali, prelevare meno negli anni buoni (quando il portafoglio rende) e di più quando serve</li>
</ul>

<h3>4. Erogazione Frazionata <span style="color: #ef4444; font-size: 0.8em;">[NUOVA 2026]</span></h3>
<p>Rate fisse su un periodo minimo di 5 anni. Simile a un piano di ammortamento.</p>
<ul>
<li><strong>Tassazione</strong>: <strong>20%</strong> base → 15% (riduzione -0,25%/anno dopo il 15° anno) — <strong>PIÙ ALTA</strong> delle altre opzioni!</li>
<li><strong>Pro</strong>: semplicità, importo prevedibile</li>
<li><strong>Contro</strong>: tassazione significativamente superiore, meno flessibile</li>
</ul>

<div class="warning">
<strong>Attenzione:</strong> L'erogazione frazionata costa mediamente il <strong>40-65% in più di tasse</strong> rispetto alle altre opzioni. Su un montante di 200.000€ con 25 anni di partecipazione, la differenza può essere di <strong>5.000-8.000€ in più di tasse</strong>. Sconsigliata nella maggior parte dei casi.
</div>

<h3>5. Capitale (ora fino al 60%)</h3>
<p>La quota richiedibile in un'unica soluzione è stata alzata dal 50% al <strong>60%</strong>. Il restante 40% va in una delle forme di rendita sopra. Se la rendita annua risultante è inferiore al 50% dell'assegno sociale (~267€/mese nel 2026), puoi richiedere il <strong>100% in capitale</strong>.</p>
<ul>
<li><strong>Tassazione</strong>: 15% → 9%</li>
<li><strong>Strategia FIRE</strong>: ritira il 60% come capitale per coprire i primi anni di FIRE, e lascia il 40% come rendita a durata definita o prelievi liberi</li>
</ul>

<div class="example">
<strong>Confronto strategico per FIRE:</strong><br><br>
<strong>Montante 200.000€ (150k contributi + 50k rendimenti), 25 anni nel fondo (aliquota 12%), età 62:</strong><br>
- Rendita vitalizia: ~800€/mese netti iniziali, rivalutata ~1,5-2%/anno, a vita, nulla agli eredi<br>
- Rendita durata definita: ~750€/mese iniziali, ricalcolata in base ai rendimenti, <strong>eredi ok</strong><br>
- <strong>Prelievi liberi: prelevi ~9.000-10.000€/anno quando serve, capitale resta investito</strong><br>
- 60% capitale (120.000€ netti ~112.000€) + 40% in rendita rivalutata (~340€/mese iniziali)<br><br>
<strong>Nota:</strong> a parita' di montante e contributi dedotti, le tasse totali pagate sono le stesse per tutte le opzioni tranne la frazionata (piu' cara del 40-65%). Per un FIRE seeker, i <strong>prelievi liberi</strong> o il <strong>mix capitale 60% + rendita durata definita</strong> sono generalmente le opzioni migliori per flessibilita' ed eredita'.
</div>

<div class="tip">
<strong>Consiglio:</strong> Anche se punti al FIRE, versa sempre almeno i 5.300€ annui nel fondo pensione (o fino a 7.950€ se hai diritto all'extradeducibilità). Il risparmio fiscale in entrata (33-43%) supera enormemente la tassazione in uscita (9-15%). Usa la RITA come ponte tra il FIRE e la pensione INPS, poi scegli tra prelievi liberi o rendita a durata definita. Usa la sezione <strong>Fondo Pensione</strong> dell'app per confrontare tutte le opzioni con i tuoi numeri.
</div>

<div class="warning">
<strong>Attenzione:</strong> I fondi pensione hanno costi di gestione che variano molto: dall'0,15% dei fondi pensione negoziali (es. Cometa, Fonchim) al 2%+ di alcuni fondi aperti bancari. La differenza su 30 anni è enorme. Scegli un fondo con costi bassi e una linea adeguata al tuo orizzonte temporale.
</div>
`
	},

	{
		id: 'pensione-inps',
		number: 13,
		title: 'Pensione INPS',
		category: 'Fiscalità Italiana',
		icon: '🏛️',
		summary:
			"Come funziona il sistema contributivo italiano, coefficienti di trasformazione e come pianificare il gap pensionistico.",
		appLink: '/profilo/',
		appLinkLabel: 'Inserisci i Dati Pensionistici',
		content: `
<h3>Il Sistema Pensionistico Italiano</h3>
<p>La pensione pubblica INPS è un elemento cruciale del piano FIRE italiano. A differenza degli americani che non possono contare su una pensione pubblica significativa, gli italiani hanno un sistema contributivo che, pur con i suoi limiti, fornisce un reddito importante dopo i 67 anni. Questo cambia radicalmente i calcoli.</p>

<h3>Il Sistema Contributivo</h3>
<p>Dal 1996 (Riforma Dini), l'Italia è passata al <strong>sistema contributivo</strong>: la pensione dipende da quanto hai versato, non dall'ultimo stipendio.</p>

<p>Come funziona:</p>
<ol>
<li>Ogni anno, il <strong>33% della RAL</strong> (per dipendenti) viene versato all'INPS come contributi (di cui ~9,19% a carico del lavoratore, il resto del datore)</li>
<li>I contributi si accumulano nel "montante contributivo", rivalutato ogni anno in base alla media quinquennale del PIL nominale</li>
<li>Al momento della pensione, il montante viene convertito in rendita annua usando i <strong>coefficienti di trasformazione</strong></li>
</ol>

<h3>I Coefficienti di Trasformazione (2024-2025)</h3>
<p>Questi coefficienti determinano quanto ricevi per ogni euro di montante accumulato:</p>
<ul>
<li><strong>57 anni</strong>: 4,270% → Per 100.000€ di montante: 4.270€/anno di pensione</li>
<li><strong>60 anni</strong>: 4,615%</li>
<li><strong>62 anni</strong>: 4,847%</li>
<li><strong>65 anni</strong>: 5,352%</li>
<li><strong>67 anni</strong>: 5,723% → Per 100.000€ di montante: 5.723€/anno</li>
<li><strong>70 anni</strong>: 6,395%</li>
<li><strong>71 anni</strong>: 6,655%</li>
</ul>

<p>Più aspetti, più alto è il coefficiente (ma meno anni di pensione ricevi).</p>

<div class="example">
<strong>Calcolo pensione per un dipendente medio:</strong><br>
RAL media carriera (35 anni di contributi): 32.000€<br>
Contributi annui: 32.000€ × 33% = 10.560€<br>
Montante dopo 35 anni (con rivalutazione media 2% annuo): circa <strong>520.000€</strong><br>
Pensione lorda a 67 anni: 520.000€ × 5,723% = <strong>29.760€/anno</strong> (~2.290€/mese lordi)<br>
Pensione netta (dopo IRPEF): circa <strong>1.750-1.850€/mese</strong><br><br>
Per una RAL più alta (45.000€ media), la pensione netta sale a circa <strong>2.300-2.500€/mese</strong>.
</div>

<h3>Requisiti per la Pensione</h3>
<p>I requisiti attuali (soggetti a revisione):</p>
<ul>
<li><strong>Pensione di vecchiaia</strong>: 67 anni di età + 20 anni di contributi</li>
<li><strong>Pensione anticipata</strong>: 42 anni e 10 mesi di contributi (uomini) / 41 anni e 10 mesi (donne), indipendentemente dall'età</li>
<li><strong>Opzione contributiva anticipata</strong>: 64 anni con 20 anni di contributi, se la pensione è almeno 3 volte l'assegno sociale (circa 1.600€/mese)</li>
</ul>

<h3>L'Impatto della Pensione INPS sul Piano FIRE</h3>
<p>La pensione INPS riduce enormemente il patrimonio necessario per il FIRE. Il piano si divide in due fasi:</p>

<ul>
<li><strong>Fase 1: Gap anni</strong> — Dal FIRE fino alla pensione INPS (es. dai 50 ai 67 anni = 17 anni). Devi coprire tutte le spese con il portafoglio.</li>
<li><strong>Fase 2: Con pensione</strong> — Dai 67 anni in poi. La pensione INPS copre gran parte delle spese, il portafoglio integra solo la differenza.</li>
</ul>

<div class="example">
<strong>Esempio di impatto:</strong><br>
Spese annuali: 24.000€. FIRE a 50 anni. Pensione INPS a 67 anni: 18.000€ netti/anno.<br><br>
<strong>Senza considerare INPS:</strong> FIRE Number = 24.000€ × 25 = 600.000€<br>
<strong>Con INPS:</strong> Devi finanziare 17 anni a 24.000€/anno dal portafoglio, poi solo 6.000€/anno (24.000-18.000) dal portafoglio per sempre.<br>
FIRE Number effettivo: circa <strong>450.000-480.000€</strong> (il calcolatore dell'app fa questo calcolo preciso).<br><br>
La pensione INPS "vale" circa 120.000-150.000€ di patrimonio in meno da accumulare!
</div>

<div class="tip">
<strong>Consiglio:</strong> Richiedi il tuo Estratto Conto Contributivo dall'INPS (accessibile con SPID su inps.it). Verifica i contributi versati e fai una simulazione della pensione futura con il servizio "La mia pensione futura". Questi dati sono essenziali per il profilo nell'app.
</div>

<h3>Importare l'Estratto Conto INPS nell'App</h3>
<p>Nella sezione <strong>Profilo → Pensione</strong> trovi il componente <em>Import Estratto Conto INPS</em> che automatizza l'inserimento dei dati. Procedura:</p>
<ol>
<li>Accedi a <strong>inps.it</strong> con SPID/CIE e vai su "Estratto conto contributivo"</li>
<li>Scarica il file nel formato disponibile: <strong>XML</strong> (preferito, più ricco di informazioni), <strong>CSV</strong> o <strong>TXT</strong></li>
<li>Nel pannello Import dell'app, trascina o seleziona il file</li>
<li>Il parser riconosce automaticamente regime generale, parasubordinati e montante precalcolato INPS</li>
<li>Vedrai la stima del montante contributivo, gli anni di contributi validi e la pensione prevista</li>
<li>Conferma per salvare i dati nel profilo: verranno usati per i calcoli di gap FIRE-pensione</li>
</ol>
<p>Il formato <strong>XML</strong> contiene anche il montante rivalutato ufficiale INPS per i parasubordinati, che l'app integra con il calcolo del regime generale per una stima più accurata.</p>

<div class="warning">
<strong>Attenzione:</strong> I coefficienti di trasformazione vengono rivisti periodicamente e tendono a scendere (per adeguarsi all'aumento dell'aspettativa di vita). Non contare sulla pensione INPS attuale: potrebbe essere il 10-15% inferiore quando la raggiungerai tra 20-30 anni. Pianifica con un margine conservativo.
</div>
`
	},

	{
		id: 'gap-pensionistico',
		number: 14,
		title: 'Il Gap Pensionistico',
		category: 'Fiscalità Italiana',
		icon: '🌉',
		summary:
			"Gli anni tra il pensionamento anticipato e la pensione INPS: strategie per coprire il gap.",
		content: `
<h3>Il Problema del Gap</h3>
<p>Il <strong>gap pensionistico</strong> è il periodo tra il momento in cui smetti di lavorare (FIRE) e il momento in cui inizi a ricevere la pensione INPS. Se vai in FIRE a 50 anni e la pensione INPS arriva a 67, hai <strong>17 anni di gap</strong> da finanziare interamente con il tuo patrimonio.</p>

<p>Questo è il periodo più critico e costoso del piano FIRE italiano. Durante il gap:</p>
<ul>
<li>Non ricevi la pensione INPS</li>
<li>Non versi più contributi (la pensione futura sarà più bassa)</li>
<li>Devi prelevare dal portafoglio senza il "cuscinetto" della pensione</li>
<li>Devi pagare contributi sanitari autonomamente (o usare il SSN che resta accessibile)</li>
</ul>

<h3>Quantificare il Gap</h3>

<div class="example">
<strong>Esempio di gap per una coppia:</strong><br>
FIRE a 50 anni. Pensione INPS stimata a 67 anni: 1.800€/mese netti a testa.<br>
Spese mensili della coppia: 3.000€ (36.000€/anno).<br><br>
<strong>Fase gap (50-67 anni = 17 anni):</strong><br>
Spese totali da coprire: 36.000€ × 17 = 612.000€ (senza considerare rendimenti e inflazione)<br><br>
<strong>Fase con pensione (da 67 anni):</strong><br>
Pensioni combinate: 3.600€/mese (43.200€/anno) > spese di 3.000€/mese<br>
Il portafoglio non deve più coprire nulla! Anzi, le pensioni superano le spese.<br><br>
Questo scenario mostra come il vero costo del FIRE in Italia è finanziare il gap, non l'intero pensionamento.
</div>

<h3>Strategie per Coprire il Gap</h3>

<h3>1. Portafoglio Investito (Strategia Base)</h3>
<p>La strategia più semplice: accumuli un patrimonio sufficiente a coprire sia il gap che un margine di sicurezza per il periodo successivo. Il calcolatore dell'app fa esattamente questo calcolo.</p>

<h3>2. RITA (Rendita Integrativa Temporanea Anticipata)</h3>
<p>Come descritto nel capitolo sui fondi pensione, la RITA permette di riscattare anticipatamente il fondo pensione:</p>
<ul>
<li>Puoi richiedere la RITA 5 anni prima della pensione di vecchiaia (a 62 anni se la pensione è a 67)</li>
<li>Se sei disoccupato da 24+ mesi, puoi richiederla 10 anni prima (a 57 anni)</li>
<li>Tassazione agevolata: 9-15%</li>
<li>Viene erogata come rendita mensile dal fondo pensione</li>
</ul>

<div class="example">
<strong>RITA come ponte:</strong><br>
Fondo pensione a 57 anni: 180.000€<br>
RITA per 10 anni (57-67): 180.000€ / 10 = 18.000€/anno lordi<br>
Tassazione (dopo 30 anni di fondo, aliquota 10,5%): ~16.110€/anno netti = 1.342€/mese<br><br>
Se le tue spese sono 2.000€/mese, la RITA copre il 67%! Il portafoglio deve coprire solo 658€/mese.
</div>

<h3>3. Versamenti Volontari INPS</h3>
<p>Puoi continuare a versare contributi volontari all'INPS anche dopo aver lasciato il lavoro. Questo:</p>
<ul>
<li>Mantiene/aumenta il montante contributivo</li>
<li>Aumenta la pensione futura</li>
<li>I contributi sono deducibili al 100% dal reddito imponibile</li>
<li>Costa circa il 33% della retribuzione convenzionale</li>
</ul>
<p>Valuta attentamente: il costo potrebbe non essere giustificato se la pensione INPS prevista è già sufficiente.</p>

<h3>4. BaristaFIRE / Lavoro Part-Time</h3>
<p>Lavorare part-time durante il gap riduce il prelievo dal portafoglio e mantiene i contributi INPS:</p>
<ul>
<li>10.000€/anno di reddito part-time riducono il prelievo dal portafoglio di 10.000€</li>
<li>Su 17 anni di gap, sono 170.000€ in meno da accumulare</li>
<li>Mantieni contributi INPS, aumentando la pensione futura</li>
<li>Vantaggi psicologici: struttura, socialità, scopo</li>
</ul>

<h3>5. Strategia Combinata (Ottimale)</h3>
<p>La strategia migliore combina tutto:</p>
<ul>
<li><strong>50-57 anni:</strong> Prelievo dal portafoglio + eventuale reddito part-time</li>
<li><strong>57-67 anni:</strong> RITA dal fondo pensione + portafoglio ridotto</li>
<li><strong>67+ anni:</strong> Pensione INPS + eventuale rendita residua del portafoglio</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Pianifica il gap anni in anticipo. Massimizza i versamenti al fondo pensione durante la fase lavorativa (5.300€/anno) per avere una RITA robusta. E considera che durante il gap avrai comunque accesso alla sanità pubblica (SSN) — non serve un'assicurazione sanitaria privata come negli USA.
</div>

<div class="warning">
<strong>Attenzione:</strong> Se lasci il lavoro prima di aver maturato 20 anni di contributi INPS, potresti non aver diritto alla pensione di vecchiaia a 67 anni. Verifica sempre i tuoi anni di contribuzione prima di pianificare il FIRE. In alternativa, valuta i versamenti volontari per raggiungere il requisito minimo.
</div>
`
	},

	// ============================================================
	// CATEGORY: Strategie Avanzate (Steps 15-19)
	// ============================================================
	{
		id: 'scenari-rischio',
		number: 15,
		title: 'Scenari di Rischio',
		category: 'Strategie Avanzate',
		icon: '⚠️',
		summary:
			"Salute, crolli di mercato, inflazione, rischi geopolitici: come testare la solidità del tuo piano FIRE.",
		appLink: '/rischi/',
		appLinkLabel: 'Analizza i Rischi',
		content: `
<h3>Prepararsi al Peggio, Sperare nel Meglio</h3>
<p>Un piano FIRE che funziona solo in condizioni ideali non è un piano: è una scommessa. La vera pianificazione finanziaria consiste nel prepararsi agli scenari avversi. Se il tuo piano sopravvive al peggio, prospererà nel caso medio.</p>

<h3>1. Crollo di Mercato Prolungato</h3>
<p>La storia ci insegna che i mercati possono scendere molto e restare bassi a lungo:</p>
<ul>
<li><strong>2000-2003:</strong> il Nasdaq perse il 78%. L'S&P 500 perse il 49%. Servivano 13 anni per tornare ai massimi in termini reali.</li>
<li><strong>2007-2009:</strong> crisi finanziaria globale, -57% sull'S&P 500. Recupero in circa 5,5 anni.</li>
<li><strong>Giappone 1989-oggi:</strong> il Nikkei ha impiegato 34 anni per tornare ai massimi nominali. In termini reali, è ancora sotto.</li>
<li><strong>Italia:</strong> il FTSE MIB è ancora lontano dai massimi del 2000 e del 2007.</li>
</ul>

<p><strong>Protezione:</strong> Diversificazione globale (non solo Italia o Europa), bond tent, cash buffer, flessibilità di spesa.</p>

<h3>2. Inflazione Elevata e Persistente</h3>
<p>Come visto nel capitolo dedicato, l'inflazione può devastare un piano FIRE. Scenari da testare:</p>
<ul>
<li>Inflazione al 5% per 5 anni consecutivi</li>
<li>Inflazione al 3% per 10 anni</li>
<li>Inflazione al 10% per 2-3 anni (come nel 2022-2023 in Italia)</li>
</ul>
<p><strong>Protezione:</strong> Azioni (protezione naturale), BTP Italia, diversificazione internazionale in valute forti.</p>

<h3>3. Problemi di Salute</h3>
<p>In Italia la sanità pubblica copre la maggior parte dei costi, ma:</p>
<ul>
<li>Le liste d'attesa possono essere lunghe (mesi per visite specialistiche)</li>
<li>Il dentista è quasi interamente privato (un impianto costa 1.500-3.000€)</li>
<li>Le RSA (Residenze Sanitarie Assistenziali) costano 1.500-3.000€/mese</li>
<li>Una malattia cronica può richiedere integrazioni private</li>
</ul>
<p><strong>Protezione:</strong> Assicurazione sanitaria integrativa (200-500€/anno), fondo per spese mediche impreviste, stile di vita sano.</p>

<h3>4. Rischio Geopolitico e Regolamentare</h3>
<ul>
<li>Cambiamenti nella tassazione degli investimenti (l'Italia potrebbe alzare il 26%)</li>
<li>Riforma pensionistica che alza l'età pensionabile</li>
<li>Crisi dell'euro o ristrutturazione del debito pubblico (i BTP non sono risk-free al 100%)</li>
<li>Patrimoniale straordinaria (improbabile ma non impossibile in caso di crisi del debito)</li>
</ul>
<p><strong>Protezione:</strong> Diversificazione geografica degli investimenti, non concentrare tutto in titoli di Stato italiani, mantenere flessibilità.</p>

<h3>5. Rischio Longevità</h3>
<p>L'aspettativa di vita in Italia è circa 83 anni, ma il 25% delle persone supera i 90 e il 10% i 95. Se vai in FIRE a 50 e vivi fino a 95, sono 45 anni di prelievi!</p>
<p><strong>Protezione:</strong> Usare un orizzonte temporale di almeno 50 anni nelle simulazioni, considerare la pensione INPS come "assicurazione sulla longevità" (è una rendita vitalizia).</p>

<h3>Come Stress-Testare il Tuo Piano</h3>
<p>Usa il calcolatore dell'app per verificare la tenuta del piano in questi scenari:</p>
<ol>
<li>Riduci il rendimento atteso di 1-2 punti percentuali</li>
<li>Aumenta le spese del 20%</li>
<li>Simula un crollo del 40% nel primo anno di FIRE</li>
<li>Aumenta l'inflazione al 4-5%</li>
<li>Aggiungi una spesa imprevista di 30.000€ al 5° anno</li>
</ol>
<p>Se il piano sopravvive alla maggior parte di questi stress test, è robusto.</p>

<div class="tip">
<strong>Consiglio:</strong> Non cercare di eliminare tutti i rischi — è impossibile e il costo (lavorare molti anni in più) è troppo alto. Concentrati sui rischi più probabili e impattanti, e abbi un piano di contingenza per ciascuno. La flessibilità è la tua migliore protezione.
</div>

<div class="warning">
<strong>Attenzione:</strong> Il rischio più grande non è finanziario ma psicologico: il panico durante un crollo di mercato. La storia mostra che chi vende nel panico trasforma una perdita temporanea in una perdita permanente. Se non riesci a dormire con un -30% in portafoglio, la tua asset allocation è troppo aggressiva.
</div>
`
	},

	{
		id: 'ottimizzazione-fiscale-prelievo',
		number: 16,
		title: 'Ottimizzazione Fiscale del Prelievo',
		category: 'Strategie Avanzate',
		icon: '🧮',
		summary:
			"L'ordine ottimale dei prelievi per minimizzare le tasse: ETF, fondi pensione, BTP e tax-loss harvesting.",
		content: `
<h3>L'Ordine Conta</h3>
<p>Una volta raggiunto il FIRE, non è solo quanto prelevi che conta, ma <strong>da dove</strong> prelevi. Diversi strumenti hanno aliquote fiscali diverse, e l'ordine di prelievo può farti risparmiare migliaia di euro l'anno in tasse.</p>

<h3>Le Aliquote a Confronto</h3>
<ul>
<li><strong>ETF e fondi azionari/obbligazionari</strong>: 26% sul capital gain</li>
<li><strong>BTP e titoli di Stato</strong>: 12,5% sul capital gain e cedole</li>
<li><strong>Fondo pensione (RITA)</strong>: 9-15% sulla prestazione</li>
<li><strong>Conto deposito</strong>: 26% sugli interessi</li>
<li><strong>Restituzione di capitale</strong>: 0% (quando vendi quote di ETF, la parte che è il tuo investimento iniziale non è tassata)</li>
</ul>

<h3>Strategia di Prelievo Ottimale</h3>
<p>L'ordine generale (dal più tassato al meno tassato) è:</p>

<ol>
<li><strong>Prima: Strumenti tassati al 26%</strong> (ETF, conti deposito) — Preleva da qui nei primi anni, specialmente se il capital gain è basso (cioè il prezzo di carico è vicino al prezzo attuale). La parte di "restituzione di capitale" non è tassata.</li>
<li><strong>Poi: BTP e titoli di Stato</strong> (12,5%) — Sfrutta la tassazione agevolata quando le plusvalenze degli ETF sono diventate significative.</li>
<li><strong>Infine: Fondo pensione (RITA)</strong> (9-15%) — Usa la RITA come ultima risorsa o in combinazione, per la sua tassazione più vantaggiosa.</li>
</ol>

<p>Ma questa è una regola generale. La strategia ottimale dipende dalla tua situazione specifica.</p>

<h3>Tax-Loss Harvesting all'Italiana</h3>
<p>Il <strong>tax-loss harvesting</strong> consiste nel vendere investimenti in perdita per generare minusvalenze che compensano le plusvalenze, riducendo le tasse. In Italia funziona così:</p>

<ul>
<li>Vendi un'azione o obbligazione in perdita → genera una minusvalenza (reddito diverso)</li>
<li>La minusvalenza può compensare plusvalenze future su azioni, obbligazioni, certificati, ETC (redditi diversi)</li>
<li><strong>NON può compensare</strong> plusvalenze su ETF e fondi (redditi di capitale)</li>
<li>Le minusvalenze scadono dopo 4 anni</li>
</ul>

<div class="example">
<strong>Tax-loss harvesting pratico:</strong><br>
Hai un BTP comprato a 100 che ora vale 92. Lo vendi: realizzi una minusvalenza di 8 per ogni BTP.<br>
Con 100 BTP (nominali 100.000€): minusvalenza = 8.000€<br>
Poi compri un BTP simile (diversa scadenza per evitare problemi di "wash sale", non regolamentato in Italia ma prudente).<br><br>
Quando venderai altri titoli con plusvalenza, i primi 8.000€ saranno esenti da tasse.<br>
Risparmio: 8.000€ × 12,5% = <strong>1.000€</strong> di tasse in meno (se BTP) o 8.000€ × 26% = <strong>2.080€</strong> (se azioni/obbligazioni corporate).
</div>

<h3>La Strategia dei "Lotti" (LIFO vs FIFO)</h3>
<p>In Italia, in regime amministrato, la vendita segue il metodo <strong>LIFO</strong> (Last In, First Out): si vendono prima le quote acquistate per ultime. Questo ha implicazioni importanti:</p>

<ul>
<li>Se le quote più recenti hanno un prezzo di carico più alto (comprate a prezzi alti), il capital gain sarà minore → meno tasse</li>
<li>Se le quote più recenti hanno un prezzo di carico più basso (comprate durante un crollo), il capital gain sarà maggiore → più tasse</li>
</ul>

<p>Puoi sfruttare questo aspetto strategicamente, ad esempio comprando quote aggiuntive durante un mercato alto per poi venderle con poco capital gain.</p>

<h3>Ottimizzazione con IRPEF</h3>
<p>Se in FIRE il tuo reddito imponibile IRPEF è basso (magari solo un piccolo reddito da freelance), puoi sfruttare:</p>
<ul>
<li><strong>No tax area</strong>: i primi 8.500€ di reddito da pensione (o 8.174€ da lavoro dipendente) sono praticamente esenti</li>
<li><strong>Detrazioni</strong> per carichi familiari, spese mediche, ecc.</li>
<li><strong>Cedolare secca</strong> al 21% sugli affitti (anziché IRPEF marginale)</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Tieni un foglio di calcolo (o usa l'app!) con tutti i tuoi investimenti, i prezzi di carico e le aliquote applicabili. Quando devi prelevare, simula diverse combinazioni per trovare quella con il carico fiscale minore. La differenza può essere di migliaia di euro l'anno.
</div>

<div class="warning">
<strong>Attenzione:</strong> Le regole fiscali cambiano. L'Italia ha modificato la tassazione degli investimenti più volte negli ultimi 20 anni (dal 12,5% unico al sistema attuale). Non basare l'intero piano su un'aliquota specifica. Pianifica con flessibilità e aggiorna la strategia quando cambiano le norme.
</div>
`
	},

	{
		id: 'immobili-piano-fire',
		number: 17,
		title: 'Immobili nel Piano FIRE',
		category: 'Strategie Avanzate',
		icon: '🏠',
		summary:
			"Pro e contro degli immobili in Italia: prima casa, affitti, IMU, cedolare secca e confronto con investimenti finanziari.",
		content: `
<h3>L'Italia e il Mattone</h3>
<p>Gli italiani sono tra i popoli con il più alto tasso di proprietà immobiliare in Europa (~73%). Il "mattone" è culturalmente considerato l'investimento più sicuro. Ma è vero? E come si inserisce nel piano FIRE?</p>

<h3>La Prima Casa: Comprare o Affittare?</h3>
<p>Questa è una delle domande più dibattute. La risposta dipende dalla tua situazione specifica:</p>

<p><strong>Vantaggi di comprare:</strong></p>
<ul>
<li>Nessun affitto da pagare in FIRE (riduce le spese correnti)</li>
<li>Detrazione interessi mutuo prima casa (19% fino a 4.000€ di interessi/anno)</li>
<li>Niente IMU sulla prima casa (tranne immobili di lusso A/1, A/8, A/9)</li>
<li>Stabilità psicologica: "la casa è mia"</li>
<li>Protezione parziale dall'inflazione</li>
</ul>

<p><strong>Svantaggi di comprare:</strong></p>
<ul>
<li>Capitale immobilizzato (200.000-400.000€ che non investirai in ETF)</li>
<li>Costi nascosti: condominio (100-200€/mese), manutenzione straordinaria, ristrutturazioni</li>
<li>Illiquidità: vendere richiede mesi e costa (agenzia 3%, notaio, tasse)</li>
<li>Riduce la flessibilità geografica</li>
<li>I prezzi immobiliari italiani sono in calo reale da 15 anni (eccetto Milano e poche altre città)</li>
</ul>

<div class="example">
<strong>Confronto numerico:</strong><br>
Opzione A: Compri casa a 250.000€ con mutuo 20 anni. Rata ~1.100€/mese. Dopo 20 anni hai la casa, zero affitto.<br>
Opzione B: Affitti a 800€/mese e investi la differenza di anticipo (50.000€) + 300€/mese risparmiati.<br><br>
Dopo 20 anni con rendimento 6% reale:<br>
Opzione B genera un portafoglio di circa <strong>290.000€</strong>, che rende ~14.500€/anno (al 5%), abbastanza per pagare l'affitto e avanzare.<br><br>
Il risultato dipende molto dal mercato immobiliare locale, dai tassi di interesse e dai rendimenti di mercato. Non c'è una risposta universale.
</div>

<h3>Immobili da Reddito</h3>
<p>Comprare per affittare può essere una strategia di reddito passivo, ma in Italia ha complicazioni:</p>

<p><strong>Tassazione:</strong></p>
<ul>
<li><strong>Cedolare secca 21%</strong> (canone libero) o <strong>10%</strong> (canone concordato in comuni ad alta tensione abitativa) — Molto vantaggiosa rispetto all'IRPEF marginale</li>
<li><strong>IMU</strong> sulle seconde case: circa 0,76-1,06% del valore catastale rivalutato. Su un immobile con rendita catastale 800€: circa 1.200-1.700€/anno</li>
<li><strong>TARI</strong> (tassa rifiuti) a carico dell'inquilino</li>
</ul>

<p><strong>Rendimento netto realistico:</strong></p>
<ul>
<li>Rendimento lordo da affitto in Italia: 4-7% (dipende dalla città)</li>
<li>Dopo IMU, cedolare secca, condominio, manutenzione, assicurazione, periodi di sfitto: rendimento netto <strong>2-4%</strong></li>
<li>Da confrontare con ETF globali al 5-7% reale, con liquidità immediata e zero gestione</li>
</ul>

<h3>Rischi Specifici dell'Immobiliare in Italia</h3>
<ul>
<li><strong>Morosità</strong>: lo sfratto in Italia richiede mediamente 12-18 mesi e ha costi legali significativi</li>
<li><strong>Manutenzione straordinaria</strong>: una caldaia (3.000€), un tetto (spesa condominiale), il rifacimento della facciata</li>
<li><strong>Rischio normativo</strong>: le regole sugli affitti cambiano spesso</li>
<li><strong>Concentrazione</strong>: un immobile in una singola città è l'opposto della diversificazione</li>
</ul>

<h3>La Prima Casa nel Calcolo FIRE</h3>
<p>Se possiedi la prima casa senza mutuo, le tue spese in FIRE sono significativamente più basse (niente affitto/rata). Questo abbassa il FIRE Number:</p>

<div class="example">
<strong>Impatto della prima casa:</strong><br>
Con affitto 800€/mese: spese annue 28.000€ → FIRE Number 700.000€<br>
Senza affitto (casa di proprietà): spese annue 18.400€ → FIRE Number 460.000€<br>
Differenza: <strong>240.000€</strong> in meno da accumulare!
</div>

<div class="tip">
<strong>Consiglio:</strong> Se hai intenzione di restare nella stessa zona per 10+ anni, comprare la prima casa può avere senso per il FIRE, perché elimina la voce di spesa più grande. Ma non comprare per investimento: in Italia il rendimento immobiliare medio è stato inferiore all'inflazione per 15 anni. Il vero investimento è il portafoglio finanziario diversificato globalmente.
</div>

<div class="warning">
<strong>Attenzione:</strong> Non confondere il valore della prima casa con il patrimonio investibile per il FIRE. La casa in cui vivi non genera reddito. Un patrimonio di 500.000€ investito è molto diverso da una casa da 400.000€ + 100.000€ investiti.
</div>
`
	},

	{
		id: 'debiti-e-fire',
		number: 18,
		title: 'Debiti e FIRE',
		category: 'Strategie Avanzate',
		icon: '💳',
		summary:
			"Strategia debiti per il FIRE: quando estinguere il mutuo anticipatamente e quando investire, detrazioni fiscali.",
		content: `
<h3>Debiti Buoni e Debiti Cattivi</h3>
<p>Non tutti i debiti sono uguali. Nell'ottica FIRE, la domanda fondamentale è: <strong>il rendimento atteso dei tuoi investimenti supera il tasso di interesse del debito?</strong> Se sì, conviene investire anziché ripagare il debito anticipatamente.</p>

<h3>La Gerarchia dei Debiti</h3>
<p>Elimina i debiti in questo ordine di priorità:</p>

<ol>
<li><strong>Carte di credito revolving</strong> (15-25% di interesse) — Emergenza assoluta. Ripaga immediatamente. Nessun investimento al mondo rende il 20%.</li>
<li><strong>Prestiti al consumo</strong> (5-12%) — Ripaga rapidamente. Non fare prestiti per beni di consumo.</li>
<li><strong>Finanziamento auto</strong> (4-8%) — Se possibile, compra auto usate in contanti.</li>
<li><strong>Prestiti studenteschi</strong> (rari in Italia, ma se presenti, tipicamente 3-5%)</li>
<li><strong>Mutuo prima casa</strong> (2-4% storico) — Questo è il debito "buono" da analizzare attentamente.</li>
</ol>

<h3>Il Dilemma del Mutuo: Estinguere o Investire?</h3>
<p>Questa è la decisione finanziaria più importante per molti aspiranti FIRE italiani. Analizziamo i numeri:</p>

<div class="example">
<strong>Scenario: Mutuo residuo 120.000€ a tasso fisso 2,5%, 15 anni rimasti. Hai 120.000€ disponibili.</strong><br><br>
<strong>Opzione A: Estingui il mutuo</strong><br>
Risparmi gli interessi residui: circa 24.000€ su 15 anni.<br>
Rendimento "garantito": 2,5% annuo (risk-free).<br>
Rata eliminata: ~800€/mese che puoi investire da ora.<br><br>

<strong>Opzione B: Investi i 120.000€ in ETF globali</strong><br>
Rendimento atteso: 7% nominale, ~5% reale.<br>
Dopo 15 anni (al 5% reale): 120.000€ → circa 250.000€<br>
Meno interessi mutuo pagati: 250.000€ - 24.000€ = 226.000€ netto<br>
Ma devi pagare 26% sulle plusvalenze: (250.000-120.000) × 26% = 33.800€<br>
Risultato netto: circa <strong>192.000€</strong> (vs 120.000€ dell'opzione A)<br><br>

<strong>Matematicamente, l'Opzione B vince di ~72.000€.</strong><br>
Ma il rendimento del 5% non è garantito. In scenari sfavorevoli, l'Opzione A potrebbe vincere.
</div>

<h3>Fattori da Considerare Oltre la Matematica</h3>

<ul>
<li><strong>Detrazione interessi mutuo prima casa</strong>: il 19% degli interessi passivi (fino a 4.000€ di interessi/anno) è detraibile dall'IRPEF. Questo riduce il costo effettivo del mutuo. Un mutuo al 3% diventa effettivamente al ~2,4% con la detrazione.</li>
<li><strong>Pace mentale</strong>: molte persone dormono meglio senza debiti. Il valore psicologico di "avere la casa pagata" è reale e non quantificabile.</li>
<li><strong>Flessibilità in FIRE</strong>: senza mutuo, le spese fisse sono molto più basse. Questo riduce il FIRE Number e aumenta la resilienza nei mercati negativi.</li>
<li><strong>Rischio del reddito</strong>: se perdi il lavoro, il mutuo va comunque pagato. Senza mutuo, puoi sopravvivere con molto meno.</li>
</ul>

<h3>Strategia Ibrida (Spesso la Migliore)</h3>
<p>Un compromesso spesso funziona meglio delle soluzioni estreme:</p>
<ul>
<li>Mantieni il mutuo se il tasso è sotto il 3%</li>
<li>Investi la differenza, ma mantieni 6-12 mesi di rate come fondo di emergenza specifico per il mutuo</li>
<li>Man mano che ti avvicini al FIRE, valuta l'estinzione anticipata per abbassare le spese fisse</li>
<li>Se il tasso supera il 4-5% (mutui recenti a tasso variabile), valuta la surroga o l'estinzione parziale</li>
</ul>

<h3>Mutuo in Fase FIRE</h3>
<p>Arrivare al FIRE con un mutuo ancora attivo non è ideale ma è possibile:</p>
<ul>
<li>La rata del mutuo è una spesa fissa che aumenta il FIRE Number</li>
<li>Il portafoglio deve generare abbastanza per coprire spese + rata</li>
<li>Rischio: in un mercato ribassista, devi comunque pagare la rata</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Se hai un mutuo a tasso fisso sotto il 2,5%, quasi certamente conviene investire anziché estinguere. Se il tasso è sopra il 4%, quasi certamente conviene estinguere. Nella zona grigia (2,5-4%), la scelta dipende dalla tua tolleranza al rischio e dalla vicinanza al FIRE.
</div>

<div class="warning">
<strong>Attenzione:</strong> Mai usare debiti per investire (leva finanziaria). La strategia "prendo un prestito al 5% e investo al 7%" sembra logica ma è estremamente rischiosa. Se il mercato scende del 30%, devi comunque ripagare il prestito. Il debito amplifica sia i guadagni che le perdite.
</div>
`
	},

	{
		id: 'monitoraggio-ribilanciamento',
		number: 19,
		title: 'Monitoraggio e Ribilanciamento',
		category: 'Strategie Avanzate',
		icon: '⚖️',
		summary:
			"Come e quando ribilanciare il portafoglio, checklist annuale e consigli di finanza comportamentale.",
		content: `
<h3>Il Pilota Automatico Non Basta</h3>
<p>Anche il miglior piano FIRE richiede manutenzione periodica. Il ribilanciamento è il processo di riportare l'asset allocation al target originale quando i movimenti di mercato l'hanno spostata. È una delle poche strategie di investimento che è allo stesso tempo prudente e potenzialmente redditizia.</p>

<h3>Cos'è il Ribilanciamento</h3>
<p>Se il tuo target è 80% azioni / 20% obbligazioni e dopo un anno di mercato positivo sei a 85/15, il ribilanciamento consiste nel vendere il 5% di azioni e comprare obbligazioni per tornare a 80/20.</p>

<p>Perché farlo?</p>
<ul>
<li><strong>Mantiene il livello di rischio desiderato</strong> — Senza ribilanciamento, dopo anni di mercato positivo saresti quasi tutto in azioni (più rischio di quanto voluto)</li>
<li><strong>Forza a "vendere alto, comprare basso"</strong> — Vendi ciò che è salito, compri ciò che è sceso. Controintuitivo ma statisticamente vantaggioso.</li>
<li><strong>Disciplina</strong> — Rimuove le emozioni dal processo di investimento</li>
</ul>

<h3>Quando Ribilanciare: Due Approcci</h3>

<h3>1. Ribilanciamento a Calendario</h3>
<p>Ribilanci a date fisse (annuale, semestrale, trimestrale):</p>
<ul>
<li><strong>Pro:</strong> Semplice, prevedibile, nessuna decisione da prendere</li>
<li><strong>Contro:</strong> Potresti ribilanciare quando non necessario, o non farlo quando serve</li>
<li><strong>Frequenza ideale:</strong> Una volta l'anno è sufficiente. Più frequente non migliora i risultati e aumenta i costi fiscali (ogni vendita genera potenziale capital gain).</li>
</ul>

<h3>2. Ribilanciamento a Soglia</h3>
<p>Ribilanci solo quando l'allocazione devia dal target oltre una soglia (es. 5% o 10%):</p>
<ul>
<li><strong>Pro:</strong> Intervieni solo quando serve, meno operazioni, meno tasse</li>
<li><strong>Contro:</strong> Devi monitorare regolarmente, richiede più disciplina</li>
<li><strong>Soglia consigliata:</strong> 5% di deviazione assoluta (es. da 80/20 a 75/25 o 85/15)</li>
</ul>

<h3>Ribilanciamento Fiscalmente Efficiente</h3>
<p>In Italia, vendere per ribilanciare genera capital gain tassabili. Strategie per minimizzare l'impatto:</p>
<ul>
<li><strong>Ribilanciamento con nuovi flussi:</strong> Invece di vendere, usa i nuovi risparmi per comprare la classe di asset sottopesata. Nessuna vendita = nessuna tassa.</li>
<li><strong>Ribilanciamento con i prelievi:</strong> In fase FIRE, preleva dalla classe di asset sovrappesata. Stai già vendendo, tanto vale farlo strategicamente.</li>
<li><strong>Ribilanciamento con dividendi/cedole:</strong> Usa i proventi per comprare la classe sottopesata.</li>
</ul>

<h3>Checklist Annuale del Piano FIRE</h3>
<p>Una volta l'anno (suggerimento: a gennaio), fai questa revisione:</p>
<ul>
<li>☐ Aggiorna il patrimonio netto totale</li>
<li>☐ <strong>Registra uno snapshot nella pagina Performance</strong> per tracciare il TWR (Time-Weighted Return) nel tempo</li>
<li>☐ Verifica le spese reali dell'anno vs budget</li>
<li>☐ Ricalcola il FIRE Number con le spese aggiornate</li>
<li>☐ Calcola la percentuale di avanzamento verso il FIRE</li>
<li>☐ Ribilancia il portafoglio se necessario</li>
<li>☐ Verifica la situazione delle minusvalenze (scadono dopo 4 anni!)</li>
<li>☐ Rivedi l'assicurazione sanitaria e sulla vita</li>
<li>☐ Aggiorna la simulazione Monte Carlo con i nuovi dati</li>
<li>☐ <strong>Confronta il tuo rendimento vs S&amp;P 500</strong> nella pagina Performance per verificare l'alpha</li>
<li>☐ Verifica i contributi al fondo pensione (massimizzati?)</li>
<li>☐ Controlla l'estratto conto contributivo INPS</li>
</ul>

<h3>Finanza Comportamentale: Il Nemico Sei Tu</h3>
<p>La ricerca mostra che l'investitore medio sottoperforma il mercato del 2-3% annuo a causa di decisioni emotive. Gli errori più comuni:</p>
<ul>
<li><strong>Panic selling:</strong> Vendere durante i crolli. I mercati si riprendono sempre (finora), ma chi vende trasforma una perdita temporanea in permanente.</li>
<li><strong>FOMO (Fear of Missing Out):</strong> Comprare dopo un forte rialzo, inseguendo il trend. Spesso compri ai massimi.</li>
<li><strong>Overconfidence:</strong> "Questa volta è diverso" o "Sono più bravo del mercato". Lo stock picking batte l'indice solo nel 10% dei casi su 15 anni.</li>
<li><strong>Anchoring:</strong> "Ho comprato a 100, non vendo sotto 100". Il prezzo di acquisto è irrilevante per le decisioni future.</li>
</ul>

<h3>Tracciare la Performance nel Tempo</h3>
<p>La pagina <strong>Performance</strong> dell'app ti permette di registrare snapshot periodici del patrimonio e calcola automaticamente il <strong>TWR (Time-Weighted Return)</strong>, neutralizzando i flussi di cassa. È lo standard usato dai gestori professionali per valutare l'alpha rispetto a un benchmark come l'S&amp;P 500. Registrare uno snapshot una volta l'anno (o al ribilanciamento) costruisce una serie storica personale da confrontare con i mercati.</p>

<div class="tip">
<strong>Consiglio:</strong> La strategia migliore contro la finanza comportamentale è l'automazione: PAC automatico, ribilanciamento a date fisse, regole scritte per i momenti di crisi. Scrivi un "Investment Policy Statement" personale quando sei calmo e razionale, e seguilo alla lettera quando il mercato impazzisce.
</div>

<div class="warning">
<strong>Attenzione:</strong> Non controllare il portafoglio ogni giorno. Gli studi mostrano che più frequentemente controlli, più è probabile che fai operazioni inutili e dannose. Una volta al mese per un controllo rapido, una volta l'anno per la revisione completa.
</div>
`,
		appLink: '/performance/',
		appLinkLabel: 'Vai alla pagina Performance'
	},

	// ============================================================
	// CATEGORY: Preparazione Finale (Step 20)
	// ============================================================
	{
		id: 'checklist-finale',
		number: 20,
		title: 'Checklist Finale FIRE',
		category: 'Preparazione Finale',
		icon: '✅',
		summary:
			"La checklist completa pre-FIRE: fondo emergenza, assicurazioni, pianificazione successoria, salute e aspetti sociali.",
		content: `
<h3>Sei Pronto per il FIRE?</h3>
<p>Hai accumulato il patrimonio necessario, le simulazioni sono positive, hai un piano di prelievo. Ma prima di lasciare il lavoro, verifica ogni punto di questa checklist completa. Saltare anche solo uno di questi aspetti potrebbe compromettere il tuo FIRE.</p>

<h3>Finanze: I Fondamentali</h3>
<ul>
<li>☐ <strong>FIRE Number raggiunto</strong> — Il patrimonio investito (esclusa la prima casa) copre almeno 25-30 volte le spese annuali</li>
<li>☐ <strong>Fondo di emergenza</strong> — 6-12 mesi di spese in liquidità pura (conto deposito o conto corrente separato). Questo è IN AGGIUNTA al patrimonio FIRE.</li>
<li>☐ <strong>Cash buffer</strong> — 2-3 anni di spese in strumenti a basso rischio (BOT, conti deposito vincolati, BTP a breve scadenza) per il rischio sequenza</li>
<li>☐ <strong>Zero debiti ad alto interesse</strong> — Nessuna carta revolving, nessun prestito al consumo, nessun finanziamento auto</li>
<li>☐ <strong>Mutuo sotto controllo</strong> — Se presente, la rata è sostenibile anche senza reddito da lavoro. Idealmente, il mutuo è estinto.</li>
<li>☐ <strong>Simulazione Monte Carlo positiva</strong> — Almeno 90-95% di successo su 40+ anni con i tuoi parametri reali</li>
</ul>

<h3>Fiscalità e Previdenza</h3>
<ul>
<li>☐ <strong>Strategia di prelievo definita</strong> — Sai da quali conti prelevare e in quale ordine per ottimizzare le tasse</li>
<li>☐ <strong>Fondo pensione massimizzato</strong> — Hai versato i 5.300€/anno per il numero massimo di anni possibile. Piano RITA definito.</li>
<li>☐ <strong>Contributi INPS verificati</strong> — Estratto conto contributivo aggiornato. Requisito minimo di 20 anni raggiunto (o piano per raggiungerlo con versamenti volontari)</li>
<li>☐ <strong>Pensione INPS stimata</strong> — Sai quanto riceverai e quando, con un margine conservativo del -15%</li>
<li>☐ <strong>Piano di Gap</strong> — Hai un piano chiaro per gli anni tra FIRE e pensione INPS (portafoglio + RITA + eventuale reddito part-time)</li>
<li>☐ <strong>Situazione fiscale pulita</strong> — Nessun contenzioso con l'Agenzia delle Entrate, dichiarazioni in regola, quadro RW compilato se hai investimenti all'estero</li>
</ul>

<h3>Assicurazioni e Protezione</h3>
<ul>
<li>☐ <strong>Assicurazione sanitaria</strong> — In Italia il SSN copre molto, ma valuta un'integrativa (200-500€/anno) per visite specialistiche e dentista</li>
<li>☐ <strong>Assicurazione sulla vita</strong> — Se hai familiari a carico (coniuge, figli), una TCM (Temporanea Caso Morte) protegge la famiglia. Costo: 200-400€/anno per 200.000€ di copertura. Non necessaria se non hai persone a carico.</li>
<li>☐ <strong>Assicurazione RC capofamiglia</strong> — Copre danni a terzi. Costa 100-150€/anno, protegge da potenziali catastrofi finanziarie (incidente con bicicletta che causa danni a una persona).</li>
<li>☐ <strong>Assicurazione casa</strong> — Incendio, furto, danni da acqua. Specialmente se la casa è il tuo asset principale. 150-300€/anno.</li>
<li>☐ <strong>Invalidità/LTC</strong> — Valuta una copertura per la non autosufficienza (Long Term Care), specialmente se non hai figli. I costi di una RSA sono 1.500-3.000€/mese.</li>
</ul>

<h3>Pianificazione Successoria</h3>
<ul>
<li>☐ <strong>Testamento</strong> — Anche se giovane, un testamento evita problemi. In Italia la "legittima" riserva una quota agli eredi necessari (coniuge, figli), ma puoi disporre della "disponibile".</li>
<li>☐ <strong>Beneficiari designati</strong> — Assicurazioni vita, fondo pensione: verifica che i beneficiari siano aggiornati</li>
<li>☐ <strong>DAT (Disposizioni Anticipate di Trattamento)</strong> — Biotestamento. Facoltativo ma importante.</li>
<li>☐ <strong>Procura</strong> — Una procura a persona di fiducia per gestire gli affari se diventi incapace</li>
<li>☐ <strong>Documentazione accessibile</strong> — Il partner/familiare di fiducia sa dove sono gli investimenti, le password, i contatti dei professionisti (commercialista, broker)</li>
</ul>

<h3>Salute e Benessere</h3>
<ul>
<li>☐ <strong>Check-up medico completo</strong> — Prima di lasciare il lavoro e la possibilità di usufruire del welfare aziendale</li>
<li>☐ <strong>Dentista in regola</strong> — Le cure dentali costose vanno fatte mentre hai ancora lo stipendio</li>
<li>☐ <strong>Piano di attività fisica</strong> — Il FIRE senza struttura può portare a sedentarietà. Palestra, sport, camminate: pianifica in anticipo</li>
<li>☐ <strong>Salute mentale</strong> — Molte persone che raggiungono il FIRE attraversano una crisi di identità. "Se non sono il mio lavoro, chi sono?" Preparati psicologicamente.</li>
</ul>

<h3>Aspetti Sociali e Pratici</h3>
<ul>
<li>☐ <strong>Piano di attività</strong> — Come riempirai le 40+ ore settimanali che prima erano lavoro? Hobby, volontariato, progetti personali, viaggi, famiglia</li>
<li>☐ <strong>Rete sociale</strong> — Molte amicizie sono legate al lavoro. Hai relazioni al di fuori dell'ufficio?</li>
<li>☐ <strong>Conversazione con il partner</strong> — Se sei in coppia, il partner è d'accordo? Ha gli stessi obiettivi? Il FIRE non funziona se uno dei due non è allineato.</li>
<li>☐ <strong>Figli (se presenti)</strong> — Il piano copre le spese per i figli (istruzione, attività, università)?</li>
<li>☐ <strong>Piano B</strong> — Se tutto va male, puoi tornare a lavorare? Mantieni competenze e rete professionale aggiornate almeno nei primi 3-5 anni di FIRE</li>
<li>☐ <strong>Trial run</strong> — Prima di lasciare il lavoro, prova a vivere con il budget FIRE per 6-12 mesi. È sostenibile? Ti rende felice?</li>
</ul>

<div class="tip">
<strong>Consiglio:</strong> Il FIRE non è un evento ma un processo. Non deve essere tutto perfetto al momento esatto della "data FIRE". Puoi fare una transizione graduale: ridurre le ore, passare a freelance, prenderti un anno sabbatico. Testa le acque prima di tuffarti.
</div>

<div class="warning">
<strong>Attenzione:</strong> Il rischio più sottovalutato del FIRE è la noia e la perdita di scopo. Il lavoro, con tutti i suoi difetti, fornisce struttura, scopo sociale, sfide intellettuali e identità. Non lasciare il lavoro solo perché puoi. Lascialo perché hai qualcosa di meglio da fare con il tuo tempo. Il FIRE è un mezzo, non un fine.
</div>

<h3>La Regola d'Oro Finale</h3>
<p>Se hai completato tutti i punti di questa checklist, sei in una posizione eccezionale. Ricorda: non devi essere perfetto. Il fatto stesso di aver letto fino a qui e di aver pianificato ti mette nel top 1% della consapevolezza finanziaria. Il FIRE è un percorso, e ogni passo — anche piccolo — ti avvicina alla libertà finanziaria.</p>

<p><strong>Congratulazioni per il percorso fatto. Ora vai e vivi la vita che hai scelto.</strong></p>
`
	}
];

export function getStepById(id: string): GuideStep | undefined {
	return guideSteps.find((s) => s.id === id);
}

export function getStepByNumber(num: number): GuideStep | undefined {
	return guideSteps.find((s) => s.number === num);
}

export function getStepsByCategory(category: string): GuideStep[] {
	return guideSteps.filter((s) => s.category === category);
}

export function getAdjacentSteps(id: string): { prev?: GuideStep; next?: GuideStep } {
	const idx = guideSteps.findIndex((s) => s.id === id);
	return {
		prev: idx > 0 ? guideSteps[idx - 1] : undefined,
		next: idx < guideSteps.length - 1 ? guideSteps[idx + 1] : undefined
	};
}
