import unittest
from uuid import UUID

from fastapi import HTTPException

from app.main import approve_intervention, execute_intervention

FACTORY_ID = UUID("10000000-0000-4000-8000-000000000001")
INTERVENTION_ID = UUID("a0000000-0000-4000-8000-000000000001")


class Result:
    def __init__(self, data):
        self.data = data


class Query:
    def __init__(self, response, queries):
        self.response = response
        self.queries = queries
        self.filters = []
        queries.append(self)

    def update(self, _values):
        return self

    def select(self, _columns):
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def maybe_single(self):
        return self

    def execute(self):
        return Result(self.response)


class FakeClient:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.queries = []

    def table(self, _name):
        return Query(self.responses.pop(0), self.queries)


class InterventionTransitionTests(unittest.TestCase):
    def test_execution_rejects_unapproved_intervention(self):
        client = FakeClient([], {"id": str(INTERVENTION_ID)})

        with self.assertRaises(HTTPException) as error:
            execute_intervention(INTERVENTION_ID, FACTORY_ID, client)

        self.assertEqual(error.exception.status_code, 409)
        self.assertIn(("status", "approved"), client.queries[0].filters)

    def test_execution_updates_only_an_approved_intervention_in_factory(self):
        row = {"id": str(INTERVENTION_ID), "status": "executed"}
        client = FakeClient([row])

        response = execute_intervention(INTERVENTION_ID, FACTORY_ID, client)

        self.assertEqual(response["data"], row)
        self.assertIn(("status", "approved"), client.queries[0].filters)
        self.assertIn(("factory_id", str(FACTORY_ID)), client.queries[0].filters)

    def test_approval_updates_only_a_proposed_intervention(self):
        row = {"id": str(INTERVENTION_ID), "status": "approved"}
        client = FakeClient([row])

        response = approve_intervention(INTERVENTION_ID, FACTORY_ID, client)

        self.assertEqual(response["data"], row)
        self.assertIn(("status", "proposed"), client.queries[0].filters)
        self.assertIn(("factory_id", str(FACTORY_ID)), client.queries[0].filters)


if __name__ == "__main__":
    unittest.main()
