
Welcome to Slay the Relics's documentation!
===========================================

Slay the Relics is a twitch extension that displays information from the game on stream. It immitates the UI from the game itself.

Twitch extension: 
https://dashboard.twitch.tv/extensions/7dgfio8rek8dhju8628riism3fd11p

Acompanying mod: 
https://steamcommunity.com/sharedfiles/filedetails/?id=1989770578


Custom tooltips API for mods
===========================

The extension supports content mods by default, it supports modded relics, potions, powers and orbs. However, some mods are using completely custom tooltips. For example Jorbs's Wanderer uses tooltips on memories and snap counter which is custom or The Poker Player uses custom tooltips to display information about the suite functions and hand combination values.

For this reason an API was implemented into the mod, that allows you, modders, display your own power tips on stream for these special custom cases (relics, potions, powers/buffs/debuffs and orbs are covered by default by the extension, even ones from mods).

How to display your custom tooltips on Twitch
---------------------------------------------

* In your mod you provide the tips you want to display in a form of pairs of ``Hitbox`` and ``ArrayList<PowerTip>`` objects. the ``ArrayList<PowerTip>`` is the description you want to display (1 or more) and ``Hitbox`` describes the area on the screen which will trigger displaying of the descriptions on mouse enter.

* These tooltips will be displayed only in combat rooms during combat
   
* The API is used as follows:

   * in any class that is annotated by ``@SpireInitializer`` declare these 2 fields (naming is the key)::

      public static ArrayList<Hitbox> slayTheRelicsHitboxes = new ArrayList<>();
      public static ArrayList<ArrayList<PowerTip>> slayTheRelicsPowerTips = new ArrayList<>();
    
   * you can thus define multiple hitboxes with different power tips, same indexes in those two arrays correspond to each other
   
   * SlayTheRelicsExporter (mod associated with the Twitch extension) will check those arrays approximately every 100 ms in ``receivePostRender()`` and send their values over to Twitch
    
   * Assuming you already have ``Hitbox`` and ``PowerTip`` objects that are used in game, all you have to do
     is put those objects into those ArrayLists every time you update them in your mod. You can probably
     use your existing objects directly for those arrays.
     
   * In ``PowerTip.body`` standard special characters are supported: ``#y, #b, #g, #r, #p, NL, [E]``

      * note that any single uppercase character in square brackets will be replaced by ``[E]``, it's sanitized as follows: ``str = str.replaceAll("\\[[A-Z]\\]", "[E]")``
        
   * These two arrays obviously have to have the same length, otherwise they will be ignored
    
   * SlayTheRelicsExporter (mod associated with the Twitch extension) in ``receivePostInitialize()``
     iterates over all loaded mod classes that are annotated by ``@SpireInitializer``. Thus you can declare the two arrays in multiple classes.

.. danger:: **It is absolutely vital** that in every object that includes them, at least one of your arrays ``slayTheRelicsHitboxes``, ``slayTheRelicsPowerTips`` is **emptied** when other characters are being played. If you fail to do so, your custom tips will be displayed even when the streamer is playing a completely different character. This would ruin the experience for everyone. Please, before releasing make absolutely sure that this is the case. Thank you. (In the example below, this is taken care of, you can see that in ``initialize()`` a ``PreRenderSubscriber`` is assigned to empty those arrays before every render cycle, so I encourage you to use it)

Example code
------------------------------------------------------------

::

   package yourmod.twitch;

   import basemod.BaseMod;
   import basemod.interfaces.PreRenderSubscriber;
   import com.evacipated.cardcrawl.modthespire.lib.SpireInitializer;
   import com.megacrit.cardcrawl.helpers.Hitbox;
   import com.megacrit.cardcrawl.helpers.PowerTip;

   import java.util.ArrayList;

   @SpireInitializer
   public class SlayTheRelicsIntegration {

      // =============== API for SlayTheRelics for displaying tooltips on Twitch =================
      //
      //
      // These two properties are read by another mod that sends their contents over to a Twitch extension called
      // SlayTheRelics and they are displayed alongside other tooltips on stream
      public static ArrayList<Hitbox> slayTheRelicsHitboxes = new ArrayList<>();
      public static ArrayList<ArrayList<PowerTip>> slayTheRelicsPowerTips = new ArrayList<>();

      public static void initialize() {
         BaseMod.subscribe((PreRenderSubscriber) (orthographicCamera) -> clear());
      }

      private static void clear() {
         slayTheRelicsHitboxes.clear();
         slayTheRelicsPowerTips.clear();
      }

      // Call this in your render methods to show custom tooltips on stream
      public static void renderTipHitbox(Hitbox hb, ArrayList<PowerTip> tips) {
         slayTheRelicsHitboxes.add(hb);
         slayTheRelicsPowerTips.add(tips);
      }
   }


.. toctree::
   :maxdepth: 2
   :caption: Contents:
   api
