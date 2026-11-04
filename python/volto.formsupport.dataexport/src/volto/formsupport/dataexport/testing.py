# -*- coding: utf-8 -*-
from plone.app.contenttypes.testing import PLONE_APP_CONTENTTYPES_FIXTURE
from plone.app.testing import applyProfile
from plone.app.testing import FunctionalTesting
from plone.app.testing import IntegrationTesting
from plone.app.testing import PloneSandboxLayer

import volto.formsupport.dataexport


class VoltoFormsupportDataexportLayer(PloneSandboxLayer):

    defaultBases = (PLONE_APP_CONTENTTYPES_FIXTURE,)

    def setUpZope(self, app, configurationContext):
        self.loadZCML(package=volto.formsupport.dataexport)

    def setUpPloneSite(self, portal):
        applyProfile(portal, "volto.formsupport.dataexport:default")


VOLTO_FORMSUPPORT_DATAEXPORT_FIXTURE = VoltoFormsupportDataexportLayer()


VOLTO_FORMSUPPORT_DATAEXPORT_INTEGRATION_TESTING = IntegrationTesting(
    bases=(VOLTO_FORMSUPPORT_DATAEXPORT_FIXTURE,),
    name="VoltoFormsupportDataexportLayer:IntegrationTesting",
)


VOLTO_FORMSUPPORT_DATAEXPORT_FUNCTIONAL_TESTING = FunctionalTesting(
    bases=(VOLTO_FORMSUPPORT_DATAEXPORT_FIXTURE,),
    name="VoltoFormsupportDataexportLayer:FunctionalTesting",
)
