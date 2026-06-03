-- 074_docs_published_read_policies
-- F-05 (foundation reality-audit 2026-06-02): docs.articles / article_versions / article_categories
-- had a single `FOR ALL TO authenticated USING hr.is_hr_admin()` policy, so a normal employee could
-- NOT read published KB content (the /ayuda KB would be empty for them, or tempt a service_role read
-- in UI -- a bad direction). Split into admin-only writes + a published-read SELECT for employees.
--
-- Visibility model (floor; richer department/role targeting is Group 3): employees see PUBLISHED,
-- non-deleted articles with visibility 'all_employees'; supervisors+ additionally see 'managers_plus'.
-- 'hr_only' and 'specific_departments'/'specific_roles' stay admin-only (fail-closed) until Group 3
-- builds the targeting. Tables are empty today, so this is a model change with no data impact.
-- One policy per command => no multiple_permissive_policies.

-- docs.articles --------------------------------------------------------------------------------
DROP POLICY IF EXISTS "docs_articles_admin" ON docs.articles;
CREATE POLICY "docs_articles_select" ON docs.articles
  FOR SELECT TO authenticated
  USING (
    hr.is_hr_admin()
    OR (
      is_published AND deleted_at IS NULL AND (
        visibility = 'all_employees'
        OR (visibility = 'managers_plus' AND (hr.has_direct_reports() OR hr.is_president_or_admin()))
      )
    )
  );
CREATE POLICY "docs_articles_insert" ON docs.articles
  FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_articles_update" ON docs.articles
  FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_articles_delete" ON docs.articles
  FOR DELETE TO authenticated USING (hr.is_hr_admin());

-- docs.article_versions ------------------------------------------------------------------------
DROP POLICY IF EXISTS "docs_versions_admin" ON docs.article_versions;
CREATE POLICY "docs_versions_select" ON docs.article_versions
  FOR SELECT TO authenticated
  USING (
    hr.is_hr_admin()
    OR (
      is_current AND NOT is_draft AND EXISTS (
        SELECT 1 FROM docs.articles a
        WHERE a.id = article_versions.article_id
          AND a.is_published AND a.deleted_at IS NULL
          AND (
            a.visibility = 'all_employees'
            OR (a.visibility = 'managers_plus' AND (hr.has_direct_reports() OR hr.is_president_or_admin()))
          )
      )
    )
  );
CREATE POLICY "docs_versions_insert" ON docs.article_versions
  FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_versions_update" ON docs.article_versions
  FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_versions_delete" ON docs.article_versions
  FOR DELETE TO authenticated USING (hr.is_hr_admin());

-- docs.article_categories (catalog: read-all names, admin writes) -------------------------------
DROP POLICY IF EXISTS "docs_categories_admin" ON docs.article_categories;
CREATE POLICY "docs_categories_select" ON docs.article_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_categories_insert" ON docs.article_categories
  FOR INSERT TO authenticated WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_categories_update" ON docs.article_categories
  FOR UPDATE TO authenticated USING (hr.is_hr_admin()) WITH CHECK (hr.is_hr_admin());
CREATE POLICY "docs_categories_delete" ON docs.article_categories
  FOR DELETE TO authenticated USING (hr.is_hr_admin());
