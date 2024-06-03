/*
 * Copyright (c) 2014-2017, Andy Janata
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted
 * provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this list of conditions
 *   and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice, this list of
 *   conditions and the following disclaimer in the documentation and/or other materials provided
 *   with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Preferences manager.
 * 
 * @author Andy Janata (ajanata@socialgamer.net)
 */

cah.Preferences = {};

cah.Preferences.apply = function(from_user_settings) {
  cah.hideConnectQuit = !!$("#hide_connect_quit").prop("checked");
  cah.noPersistentId = !!$("#no_persistent_id").prop("checked");

  cah.ignoreList = {};
  $($('#ignore_list').val().split('\n')).each(function() {
    cah.ignoreList[this] = true;
  });

  cah.desktopNotifications = !!$("#desktop_notifications").prop("checked");
  if (cah.desktopNotifications && from_user_settings) {
    Notification.requestPermission(function(result) {
      switch (result) {
        case "default":
          // Permission dialog dismissed. Maybe by mistake? Give the user another chance.
          $("#desktop_notifications_dismissed_dialog").dialog("open");
          break;

        case "denied":
          // Permission denied. Can't do anything except for informing the user.
          $("#desktop_notifications_denied_dialog").dialog("open");
          break;
      }
    });
  }

  // TODO card set filters
};

cah.Preferences.load = function() {
  if ($.cookie("hide_connect_quit")) {
    $("#hide_connect_quit").prop('checked', true);
  } else {
    $("#hide_connect_quit").prop('checked', false);
  }

  if ($.cookie("no_persistent_id")) {
    $("#no_persistent_id").prop('checked', true);
    cah.persistentId = null;
  } else {
    $("#no_persistent_id").prop('checked', false);
    cah.persistentId = $.cookie("persistent_id");
  }

  if ($.cookie("ignore_list")) {
    $("#ignore_list").val($.cookie("ignore_list"));
  } else {
    $("#ignore_list").val("");
  }

  if (! ("Notification" in window)) {
    // No support for Desktop Notifications:
    cah.Preferences.setDesktopNotifications(false);
    $("#desktop_notifications").prop('disabled', true);
  } else {
    cah.Preferences.setDesktopNotifications(
      $.cookie("desktop_notifications") !== "false"
    );
  }

  // If we haven't gotten the list of card sets from the server yet, this should fail silently.
  cah.Preferences.updateCardSetFilters();

  cah.Preferences.apply();
};

cah.Preferences.save = function(from_user_settings) {
  if ($("#hide_connect_quit").prop("checked")) {
    cah.setCookie("hide_connect_quit", true);
  } else {
    cah.removeCookie("hide_connect_quit");
  }

  if ($("#no_persistent_id").prop("checked")) {
    cah.setCookie("no_persistent_id", true);
    cah.removeCookie("persistent_id");
    cah.persistentId = null;
  } else {
    cah.removeCookie("no_persistent_id");
  }

  cah.setCookie("ignore_list", $("#ignore_list").val());

  if ("Notification" in window) {
    cah.setCookie(
      "desktop_notifications",
      !!$("#desktop_notifications").prop("checked")
    );
  }

  // card set filters
  var bannedSets = [];
  var requiredSets = [];
  var func = function(whichList, setArray) {
    $("#cardsets_" + whichList + " option").each(function() {
      setArray.push(this.value);
    });
  };
  func("banned", bannedSets);
  func("required", requiredSets);
  cah.setCookie("cardsets_banned", bannedSets.join(","));
  cah.setCookie("cardsets_required", requiredSets.join(","));

  cah.Preferences.apply(from_user_settings);
};

cah.Preferences.setDesktopNotifications = function(enabled) {
  $("#desktop_notifications").prop("checked", enabled);
}

cah.Preferences.getBannedCardSetIds = function() {
  var banned = [];
  if (cah.getCookie("cardsets_banned")) {
    banned = cah.getCookie("cardsets_banned").split(",");
  }
  for ( var index in banned) {
    banned[index] = Number(banned[index]);
  }

  return banned;
};

cah.Preferences.getRequiredCardSetIds = function() {
  var required = [];
  if (cah.getCookie("cardsets_required")) {
    required = cah.getCookie("cardsets_required").split(",");
  }
  for ( var index in required) {
    required[index] = Number(required[index]);
  }

  return required;
};

cah.Preferences.updateCardSetFilters = function() {
  $("#cardsets_banned").find("option").remove();
  $("#cardsets_neutral").find("option").remove();
  $("#cardsets_required").find("option").remove();

  var banned = cah.Preferences.getBannedCardSetIds();
  var required = cah.Preferences.getRequiredCardSetIds();
  for ( var weight in cah.CardSet.byWeight) {
    var cardSet = cah.CardSet.byWeight[weight];
    var whichList = "neutral";
    if (-1 !== $.inArray(cardSet.getId(), banned)) {
      whichList = "banned";
    } else if (-1 !== $.inArray(cardSet.getId(), required)) {
      whichList = "required";
    }
    cah.addItem("cardsets_" + whichList, cardSet.getId(), cardSet.getName(), whichList);
  }
};

cah.Preferences.transferCardSets = function(sourceList, destList) {
  cah.transferItems("cardsets_" + sourceList, "cardsets_" + destList, destList, function(a, b) {
    return cah.CardSet.list[a.value].getWeight() - cah.CardSet.list[b.value].getWeight();
  });
};
