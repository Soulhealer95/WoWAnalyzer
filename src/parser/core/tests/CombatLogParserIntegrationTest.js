import EventEmitter from 'parser/core/modules/EventEmitter';
import { i18n } from 'interface/RootLocalizationProvider';
import { loadLogSync } from './log-tools';

/**
 * Generates an integration test for a spec's CombatLogParser instance.
 *
 * The integration test applies the parser to a single fight that is
 * downloaded and stored in the repository.
 *
 * `console.log` and `console.warn` are suppressed during the test, but
 * `console.error` is not. This behavior can be disabled with the
 * `suppressWarn` and `supressLog` parameters.
 *
 * To obtain the necessary JSON, load the report of interest and get the
 * URLs for each call to the WoWAnalyzer API from the 'Network' section
 * of the developer tools. Download the contents of each URL and store
 * them somewhere. The full set of events should be gzipped (which
 * reduces space usage from several MB to ~100kb).
 *
 * See the Brewmaster analyzer for a worked example.
 *
 * @param {object} parserClass - (uninstantiated) CombatLogParser subclass to test.
 * @param {string} reportPath - Path to the report JSON.
 * @param {string} combatantInfoPath - Path to the combatant info JSON.
 * @param {string} eventPath - Path to the gzipped combat event JSON.
 * @param {number} fightId - ID of the fight to parse.
 * @param {number} playerId - ID of the player to render.
 * @param {boolean} suppressWarn - Suppress `console.warn`
 * @param {boolean} suppressLog - Suppress `console.log`
 */
export default function integrationTest(parserClass, key, fightId, playerId, suppressWarn=true, suppressLog=true) {
  return () => {
    let log;
    beforeAll(() => {
      log = loadLogSync(key);
    });

    const _console = {};
    beforeEach(() => {
      if(suppressWarn) {
        _console.warn = console.warn;
        console.warn = () => undefined;
      }
      if(suppressLog) {
        _console.log = console.log;
        console.log = () => undefined;
      }
    });

    afterEach(() => {
      if(suppressWarn) {
        console.warn = _console.warn;
      }
      if(suppressLog) {
        console.log = _console.log;
      }
    });

    it('should parse the example report without crashing', () => {
      const friendlies = log.meta.friendlies.find(({id}) => id === playerId);
      const fight = log.meta.fights.find(({id}) => id === fightId);
      const parser = new parserClass(
        log.meta, 
        friendlies,
        fight,
        log.combatants
      );
      log.events.forEach(event => parser.getModule(EventEmitter).triggerEvent(event));
      parser.finish();
      const results = parser.generateResults({
        i18n,
        adjustForDowntime: false,
      });
      expect(results).toBeTruthy();
    });
  };
}
