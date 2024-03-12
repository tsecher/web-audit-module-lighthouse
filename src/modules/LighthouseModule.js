import {AbstractPuppeteerJourneyModule} from 'web_audit/dist/journey/AbstractPuppeteerJourneyModule.js';
import {PuppeteerJourneyEvents} from 'web_audit/dist/journey/AbstractPuppeteerJourney.js';
import {ModuleEvents} from 'web_audit/dist/modules/ModuleInterface.js';
import lighthouse from "lighthouse";

/**
 * Lighthouse Module events.
 */
export const LighthouseModuleEvents = {
	createLighthouseModule: 'lighthouse_module__createLighthouseModule',
	beforeAnalyse: 'lighthouse_module__beforeAnalyse',
	onResult: 'lighthouse_module__onResult',
	onResultDetail: 'lighthouse_module__onResultDetail',
	afterAnalyse: 'lighthouse_module__afterAnalyse',
};

/**
 * Lighthouse.
 */
export default class LighthouseModule extends AbstractPuppeteerJourneyModule {
	get name() {
		return 'Lighthouse';
	}

	get id() {
		return `lighthouse`;
	}

	defaultOptions = {
		output: 'json',
		onlyCategories: ['performance', 'seo', 'best-practices', 'accessibility'],
	};
	contextsData = {};

	/**
	 * {@inheritdoc}
	 */
	async init(context) {
		this.context = context;
		// Install assets coverage store.
		this.context.config.storage?.installStore('lighthouse', this.context, {
			url: 'Url',
			context: 'Context',
			performance: 'Performance',
			seo: 'SEO',
			'best-practices': 'Best Practices',
			accessibility: 'Accessibility',
		});

		// Emit.
		this.context.eventBus.emit(LighthouseModuleEvents.createLighthouseModule, {module: this});
	}

	/**
	 * {@inheritdoc}
	 */
	initEvents(journey) {
		journey.on(PuppeteerJourneyEvents.JOURNEY_START, async (data) => {
			this.contextsData = [];
		});
		journey.on(PuppeteerJourneyEvents.JOURNEY_NEW_CONTEXT, async (data) => {
			await this.launchLighthouse(data.wrapper, data.name)
		});
	}

	/**
	 * Laucnh lighthouse.
	 *
	 * @param {PageWrapper} wrapper
	 *   Page wrapper.
	 *
	 * @returns {Promise<undefined>}
	 *
	 * @private
	 */
	async launchLighthouse(wrapper, contextName) {
		this.context?.eventBus.emit(ModuleEvents.startsComputing, {module: this});

		const result = await lighthouse(
			wrapper.page.url(),
			{output:'html'},
			undefined,
			wrapper.page,
		);

		this.contextsData[contextName] = {
			report: result?.lhr,
			html: result?.report,
		};

		this.context?.eventBus.emit(ModuleEvents.endsComputing, {module: this});
	}

	/**
	 * {@inheritdoc}
	 */
	async analyse(urlWrapper) {
		this.context?.eventBus.emit(ModuleEvents.startsComputing, {module: this});
		for (const contextName in this.contextsData) {
			if (contextName) {
				this.analyseContext(contextName, this.contextsData[contextName], urlWrapper);
			}
		}

		this.context?.eventBus.emit(ModuleEvents.endsComputing, {module: this});

		return true;
	}

	/**
	 * Analyse context.
	 *
	 * @param contextName
	 * @param contextReport
	 * @param urlWrapper
	 * @returns {Promise<void>}
	 */
	analyseContext(contextName, contextReport, urlWrapper) {
		// Report
		const result = {
			context: contextName,
			url: urlWrapper.url.toString(),
		};

		this.getOptions()
			?.onlyCategories
			?.map((cat) => {
				try {
					result[cat] = contextReport.report.categories[cat].score;
				} catch (error) {
					this.context?.config?.logger.error(error);
				}
			});

		const eventData = {
			module: this,
			url: urlWrapper,
			result: result,
			report: contextReport
		};
		this.context?.eventBus.emit(LighthouseModuleEvents.onResult, eventData);
		this.context?.eventBus.emit(ModuleEvents.onAnalyseResult, eventData);


		try{
			this.context?.config?.logger.result(`Lighthouse`, result, urlWrapper.url.toString());
		}
		catch(err){
			this.context?.config?.logger.error(err);
		}

		this.context?.config?.storage?.add('lighthouse', this.context, result);

		this.context?.eventBus.emit(LighthouseModuleEvents.afterAnalyse, eventData);
		this.context?.eventBus.emit(ModuleEvents.afterAnalyse, eventData);
	}

}
